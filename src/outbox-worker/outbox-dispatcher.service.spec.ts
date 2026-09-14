import { OutboxMessageStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma-service';
import { DocumentProcessingPublisher } from 'src/queue/document-processing/publisher';
import { OutboxDispatcherService } from './outbox-dispatcher.service';

const mockPrismaFn = () => jest.fn<Promise<unknown>, unknown[]>();

const prismaService = {
  outboxMessage: {
    update: mockPrismaFn(),
    updateMany: mockPrismaFn(),
  },
};

const documentProcessingPublisher = {
  publishOutboxMessage: jest.fn<Promise<void>, unknown[]>(),
};

describe('OutboxDispatcherService', () => {
  const message = {
    id: 'message-id',
    exchange: 'document.processing',
    routingKey: 'rag.ingestion.requested',
    payload: { jobId: 'job-id' },
    status: OutboxMessageStatus.PENDING,
    attempts: 0,
    maxAttempts: 10,
    nextAttemptAt: new Date('2026-09-03T00:00:00.000Z'),
    lockedAt: null,
    publishedAt: null,
    lastError: null,
    createdAt: new Date('2026-09-03T00:00:00.000Z'),
    updatedAt: new Date('2026-09-03T00:00:00.000Z'),
  };

  let service: OutboxDispatcherService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OutboxDispatcherService(
      prismaService as unknown as PrismaService,
      documentProcessingPublisher as unknown as DocumentProcessingPublisher,
    );
  });

  it('publishes a message and marks it as published', async () => {
    prismaService.outboxMessage.updateMany.mockResolvedValue({ count: 1 });
    documentProcessingPublisher.publishOutboxMessage.mockResolvedValue();

    await service['dispatchMessage'](message);

    expect(
      documentProcessingPublisher.publishOutboxMessage,
    ).toHaveBeenCalledWith({
      exchange: message.exchange,
      routingKey: message.routingKey,
      payload: message.payload,
    });
    expect(prismaService.outboxMessage.update).toHaveBeenCalledWith({
      where: { id: message.id },
      data: {
        status: OutboxMessageStatus.PUBLISHED,
        publishedAt: expect.any(Date) as Date,
        lockedAt: null,
        lastError: null,
      },
    });
  });

  it('schedules a retry when publishing fails', async () => {
    prismaService.outboxMessage.updateMany.mockResolvedValue({ count: 1 });
    documentProcessingPublisher.publishOutboxMessage.mockRejectedValue(
      new Error('RabbitMQ is down'),
    );

    await service['dispatchMessage'](message);

    expect(prismaService.outboxMessage.update).toHaveBeenCalledWith({
      where: { id: message.id },
      data: {
        status: OutboxMessageStatus.PENDING,
        attempts: 1,
        nextAttemptAt: expect.any(Date) as Date,
        lockedAt: null,
        lastError: 'RabbitMQ is down',
      },
    });
  });
});
