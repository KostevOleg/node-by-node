import { PrismaService } from 'src/prisma/prisma-service';
import { RabbitMqPublisher } from 'src/queue/rabbitmq.publisher';
import { FileProcessingProducer } from './file-processing.producer';

const mockPrismaFn = () => jest.fn<(...args: unknown[]) => Promise<unknown>>();

const prismaService = {
  fileProcessingJob: {
    create: mockPrismaFn(),
  },
};

const rabbitMqPublisher = {
  publishFileProcessingJob: jest.fn(),
};

describe('FileProcessingProducer', () => {
  it('creates a processing job and publishes it to RabbitMQ', async () => {
    const service = new FileProcessingProducer(
      prismaService as unknown as PrismaService,
      rabbitMqPublisher as unknown as RabbitMqPublisher,
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
    expect(rabbitMqPublisher.publishFileProcessingJob).toHaveBeenCalledWith({
      jobId: job.id,
      fileId: file.id,
      organizationId: file.organizationId,
      storageKey: file.storageKey,
      correlationId: job.correlationId,
    });
  });
});
