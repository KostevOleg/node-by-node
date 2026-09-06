import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { OutboxMessage, OutboxMessageStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma-service';
import { DocumentProcessingPublisher } from 'src/queue/document-processing/publisher';

const OUTBOX_POLL_INTERVAL_MS = 2_000;
const OUTBOX_BATCH_SIZE = 25;
const OUTBOX_PROCESSING_LOCK_TTL_MS = 60_000;
const OUTBOX_RETRY_BASE_DELAY_MS = 10_000;
const OUTBOX_RETRY_MAX_DELAY_MS = 300_000;

@Injectable()
export class OutboxDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxDispatcherService.name);
  private timer?: NodeJS.Timeout;
  private isDispatching = false;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly documentProcessingPublisher: DocumentProcessingPublisher,
  ) {}

  onModuleInit(): void {
    this.logger.log('Outbox dispatcher initialized');

    this.timer = setInterval(() => {
      void this.dispatchPendingMessages();
    }, OUTBOX_POLL_INTERVAL_MS);

    void this.dispatchPendingMessages();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async dispatchPendingMessages(): Promise<void> {
    if (this.isDispatching) {
      return;
    }

    this.isDispatching = true;

    try {
      const now = new Date();
      const staleLockedBefore = new Date(
        now.getTime() - OUTBOX_PROCESSING_LOCK_TTL_MS,
      );

      const messages = await this.prismaService.outboxMessage.findMany({
        where: {
          OR: [
            {
              status: OutboxMessageStatus.PENDING,
              nextAttemptAt: {
                lte: now,
              },
            },
            {
              status: OutboxMessageStatus.PROCESSING,
              lockedAt: {
                lte: staleLockedBefore,
              },
            },
          ],
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: OUTBOX_BATCH_SIZE,
      });

      for (const message of messages) {
        await this.dispatchMessage(message);
      }
    } catch (error) {
      this.logger.error(
        'Failed to dispatch outbox batch',
        this.formatError(error),
      );
    } finally {
      this.isDispatching = false;
    }
  }

  private async dispatchMessage(message: OutboxMessage): Promise<void> {
    const now = new Date();
    const staleLockedBefore = new Date(
      now.getTime() - OUTBOX_PROCESSING_LOCK_TTL_MS,
    );

    const locked = await this.prismaService.outboxMessage.updateMany({
      where: {
        id: message.id,
        OR: [
          {
            status: OutboxMessageStatus.PENDING,
            nextAttemptAt: {
              lte: now,
            },
          },
          {
            status: OutboxMessageStatus.PROCESSING,
            lockedAt: {
              lte: staleLockedBefore,
            },
          },
        ],
      },
      data: {
        status: OutboxMessageStatus.PROCESSING,
        lockedAt: now,
      },
    });

    if (locked.count === 0) {
      return;
    }

    try {
      await this.documentProcessingPublisher.publishOutboxMessage({
        exchange: message.exchange,
        routingKey: message.routingKey,
        payload: message.payload,
      });

      await this.prismaService.outboxMessage.update({
        where: {
          id: message.id,
        },
        data: {
          status: OutboxMessageStatus.PUBLISHED,
          publishedAt: new Date(),
          lockedAt: null,
          lastError: null,
        },
      });
    } catch (error) {
      await this.markMessageForRetry(message, error);
    }
  }

  private async markMessageForRetry(
    message: OutboxMessage,
    error: unknown,
  ): Promise<void> {
    const attempts = message.attempts + 1;
    const exhausted = attempts >= message.maxAttempts;
    const retryDelayMs = this.getRetryDelayMs(attempts);

    await this.prismaService.outboxMessage.update({
      where: {
        id: message.id,
      },
      data: {
        status: exhausted
          ? OutboxMessageStatus.FAILED
          : OutboxMessageStatus.PENDING,
        attempts,
        nextAttemptAt: new Date(Date.now() + retryDelayMs),
        lockedAt: null,
        lastError: this.formatError(error),
      },
    });

    this.logger.warn(
      `Outbox message ${message.id} publish failed attempt=${attempts}`,
    );
  }

  private getRetryDelayMs(attempts: number): number {
    return Math.min(
      OUTBOX_RETRY_BASE_DELAY_MS * 2 ** Math.max(attempts - 1, 0),
      OUTBOX_RETRY_MAX_DELAY_MS,
    );
  }

  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
