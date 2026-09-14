import { PrismaService } from 'src/prisma/prisma-service';
import { OutboxService } from 'src/outbox/outbox.service';
import {
  DOCUMENT_PROCESSING_EXCHANGE,
  SALES_PROCESSING_ROUTING_KEY,
} from 'src/queue/document-processing/constants';
import { FileProcessingProducer } from './file-processing.producer';

const mockPrismaFn = () => jest.fn<Promise<unknown>, unknown[]>();

const prismaService = {
  fileProcessingJob: {
    create: mockPrismaFn(),
  },
};

const outboxService = {
  enqueue: jest.fn<Promise<void>, unknown[]>(),
};

describe('FileProcessingProducer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a processing job and enqueues an outbox message', async () => {
    const service = new FileProcessingProducer(
      prismaService as unknown as PrismaService,
      outboxService as unknown as OutboxService,
    );

    const file = {
      id: 'file-id',
      organizationId: 'organization-id',
      storageKey: 'organizations/organization-id/files/file.xlsx',
    };
    const job = {
      id: 'job-id',
      correlationId: 'correlation-id',
    };

    prismaService.fileProcessingJob.create.mockResolvedValue(job);

    await service.enqueueFileProcessingJob(file);

    expect(prismaService.fileProcessingJob.create).toHaveBeenCalledWith({
      data: {
        fileId: file.id,
        organizationId: file.organizationId,
        correlationId: expect.any(String) as string,
      },
    });
    expect(outboxService.enqueue).toHaveBeenCalledWith(
      {
        exchange: DOCUMENT_PROCESSING_EXCHANGE,
        routingKey: SALES_PROCESSING_ROUTING_KEY,
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
