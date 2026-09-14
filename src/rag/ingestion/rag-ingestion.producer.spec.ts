import { PrismaService } from 'src/prisma/prisma-service';
import { OutboxService } from 'src/outbox/outbox.service';
import {
  DOCUMENT_PROCESSING_EXCHANGE,
  RAG_INGESTION_ROUTING_KEY,
} from 'src/queue/document-processing/constants';
import { RagIngestionProducer } from './rag-ingestion.producer';

const mockPrismaFn = () => jest.fn<Promise<unknown>, unknown[]>();

const prismaService = {
  ragIngestionJob: {
    create: mockPrismaFn(),
  },
};

const outboxService = {
  enqueue: jest.fn<Promise<void>, unknown[]>(),
};

describe('RagIngestionProducer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a RAG ingestion job and enqueues an outbox message', async () => {
    const service = new RagIngestionProducer(
      prismaService as unknown as PrismaService,
      outboxService as unknown as OutboxService,
    );

    const file = {
      id: 'file-id',
      organizationId: 'organization-id',
      storageKey: 'organizations/organization-id/files/file.txt',
    };
    const job = {
      id: 'job-id',
      correlationId: 'correlation-id',
    };

    prismaService.ragIngestionJob.create.mockResolvedValue(job);

    await service.enqueueRagIngestionJob(file);

    expect(prismaService.ragIngestionJob.create).toHaveBeenCalledWith({
      data: {
        fileId: file.id,
        organizationId: file.organizationId,
        correlationId: expect.any(String) as string,
      },
    });
    expect(outboxService.enqueue).toHaveBeenCalledWith(
      {
        exchange: DOCUMENT_PROCESSING_EXCHANGE,
        routingKey: RAG_INGESTION_ROUTING_KEY,
        payload: {
          jobId: job.id,
          fileId: file.id,
          organizationId: file.organizationId,
          storageKey: file.storageKey,
          correlationId: job.correlationId,
        },
      },
      prismaService,
    );
  });
});
