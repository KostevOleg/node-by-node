import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileProcessingStatus } from '@prisma/client';
import amqp, { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { FileProcessingJobMessage } from 'src/file-processing/messages/file-processing-job.message';
import { PrismaService } from 'src/prisma/prisma-service';
import {
  RABBITMQ_DLQ_ROUTING_KEY,
  RABBITMQ_EXCHANGE,
  RABBITMQ_MAX_PROCESSING_ATTEMPTS,
  RABBITMQ_QUEUE,
} from 'src/queue/rabbitmq.constants';
import { assertFileProcessingTopology } from 'src/queue/rabbitmq.topology';
import { ObjectStorageService } from 'src/files/storage/object-storage.service';
import { SalesExcelParserService } from './sales-excel-parser.service';
import { Readable } from 'node:stream';

@Injectable()
export class FileProcessingConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FileProcessingConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly objectStorageService: ObjectStorageService,
    private readonly salesExcelParserService: SalesExcelParserService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.getOrThrow<string>('RABBITMQ_URL');

    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();

    await assertFileProcessingTopology(this.channel);

    await this.channel.prefetch(1);
    await this.channel.consume(RABBITMQ_QUEUE, (message) => {
      void this.handleMessage(message);
    });

    this.logger.log('File processing consumer started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  private async handleMessage(message: ConsumeMessage | null): Promise<void> {
    if (!message || !this.channel) {
      return;
    }

    let jobMessage: FileProcessingJobMessage | undefined;

    try {
      jobMessage = this.parseMessage(message);

      const job = await this.getProcessingJob(jobMessage);

      if (job.status === FileProcessingStatus.COMPLETED) {
        this.channel.ack(message);
        this.logger.log(
          `Skipping already completed file processing job ${jobMessage.jobId}`,
        );
        return;
      }

      if (job.status === FileProcessingStatus.FAILED) {
        this.channel.ack(message);
        this.logger.log(
          `Skipping already failed file processing job ${jobMessage.jobId}`,
        );
        return;
      }

      await this.markJobAsProcessing(jobMessage);

      const object = await this.objectStorageService.getObject(
        job.file.storageKey,
      );
      const buffer = await this.streamToBuffer(object.body);
      const result = await this.salesExcelParserService.parse(buffer);

      await this.prismaService.fileProcessingJob.updateMany({
        where: {
          id: jobMessage.jobId,
          status: FileProcessingStatus.PROCESSING,
        },
        data: {
          status: FileProcessingStatus.COMPLETED,
          totalQuantity: result.totalQuantity,
          totalRevenue: result.totalRevenue,
          completedAt: new Date(),
        },
      });

      this.channel.ack(message);
      this.logger.log(`Processed file processing job ${jobMessage.jobId}`);
    } catch (error) {
      await this.handleProcessingFailure(message, jobMessage, error);
    }
  }

  private parseMessage(message: ConsumeMessage): FileProcessingJobMessage {
    return JSON.parse(message.content.toString()) as FileProcessingJobMessage;
  }

  private async getProcessingJob(message: FileProcessingJobMessage) {
    const job = await this.prismaService.fileProcessingJob.findUnique({
      where: { id: message.jobId },
      include: { file: true },
    });

    if (!job) {
      throw new Error(`File processing job ${message.jobId} was not found`);
    }

    if (
      job.fileId !== message.fileId ||
      job.organizationId !== message.organizationId
    ) {
      throw new Error(`File processing job ${message.jobId} payload mismatch`);
    }

    if (job.file.deletedAt) {
      throw new Error(`File ${message.fileId} was deleted`);
    }

    if (job.file.extension !== '.xlsx') {
      throw new Error(`File ${message.fileId} is not an .xlsx file`);
    }

    return job;
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Uint8Array[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  private async markJobAsProcessing(
    message: FileProcessingJobMessage,
  ): Promise<void> {
    const result = await this.prismaService.fileProcessingJob.updateMany({
      where: {
        id: message.jobId,
        fileId: message.fileId,
        status: FileProcessingStatus.PENDING,
      },
      data: {
        status: FileProcessingStatus.PROCESSING,
        startedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new Error(`File processing job ${message.jobId} is not pending`);
    }
  }

  private async markJobAsFailed(
    message: FileProcessingJobMessage | undefined,
    error: unknown,
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (message) {
      await this.prismaService.fileProcessingJob.updateMany({
        where: {
          id: message.jobId,
          status: {
            not: FileProcessingStatus.COMPLETED,
          },
        },
        data: {
          status: FileProcessingStatus.FAILED,
          failedAt: new Date(),
          errorMessage,
        },
      });
    }

    this.logger.error('File processing job failed', errorMessage);
  }

  private async handleProcessingFailure(
    message: ConsumeMessage,
    jobMessage: FileProcessingJobMessage | undefined,
    error: unknown,
  ): Promise<void> {
    if (this.isPermanentProcessingError(error)) {
      await this.markJobAsFailed(jobMessage, error);
      this.channel?.ack(message);
      return;
    }

    const attempts = await this.incrementJobAttempts(jobMessage, error);
    if (attempts < RABBITMQ_MAX_PROCESSING_ATTEMPTS) {
      await this.markJobAsPending(jobMessage, error);
      this.channel?.nack(message, false, false);
      return;
    }

    await this.markJobAsFailed(jobMessage, error);
    this.publishMessage(message, RABBITMQ_DLQ_ROUTING_KEY);
    this.channel?.ack(message);
  }

  private isPermanentProcessingError(error: unknown): boolean {
    return error instanceof BadRequestException;
  }

  private async incrementJobAttempts(
    message: FileProcessingJobMessage | undefined,
    error: unknown,
  ): Promise<number> {
    if (!message) {
      return 1;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    const job = await this.prismaService.fileProcessingJob.update({
      where: { id: message.jobId },
      data: {
        attempts: {
          increment: 1,
        },
        errorMessage,
      },
      select: {
        attempts: true,
      },
    });

    return job.attempts;
  }
  private publishMessage(message: ConsumeMessage, routingKey: string): void {
    const contentType =
      typeof message.properties.contentType === 'string'
        ? message.properties.contentType
        : undefined;
    const correlationId =
      typeof message.properties.correlationId === 'string'
        ? message.properties.correlationId
        : undefined;

    this.channel?.publish(RABBITMQ_EXCHANGE, routingKey, message.content, {
      persistent: true,
      contentType,
      correlationId,
    });
  }
  private async markJobAsPending(
    message: FileProcessingJobMessage | undefined,
    error: unknown,
  ): Promise<void> {
    if (!message) {
      return;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    await this.prismaService.fileProcessingJob.updateMany({
      where: {
        id: message.jobId,
        status: FileProcessingStatus.PROCESSING,
      },
      data: {
        status: FileProcessingStatus.PENDING,
        errorMessage,
      },
    });
  }
}
