import { PrismaService } from 'src/prisma/prisma-service';
import { DocumentProcessingPublisher } from 'src/queue/document-processing/publisher';
import { RagIngestionProducer } from './rag-ingestion.producer';

const mockPrismaFn = () => jest.fn<(...args: unknown[]) => Promise<unknown>>();

const prismaService = {
  ragIngestionJob: {
    create: mockPrismaFn(),
  },
};

const documentProcessingPublisher = {
  publishRagIngestionJob: jest.fn(),
};

describe('RagIngestionProducer', () => {
  it('creates a RAG ingestion job and publishes it to RabbitMQ', async () => {
    const service = new RagIngestionProducer(
      prismaService as unknown as PrismaService,
      documentProcessingPublisher as unknown as DocumentProcessingPublisher,
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
    expect(
      documentProcessingPublisher.publishRagIngestionJob,
    ).toHaveBeenCalledWith({
      jobId: job.id,
      fileId: file.id,
      organizationId: file.organizationId,
      storageKey: file.storageKey,
      correlationId: job.correlationId,
    });
  });
});
