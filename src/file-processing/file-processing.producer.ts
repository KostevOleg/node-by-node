import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RabbitMqPublisher } from 'src/queue/rabbitmq.publisher';
import { PrismaService } from 'src/prisma/prisma-service';

type FileProcessingSourceFile = {
  id: string;
  organizationId: string;
  storageKey: string;
};
@Injectable()
export class FileProcessingProducer {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly rabbitMqPublisher: RabbitMqPublisher,
  ) {}

  async enqueueFileProcessingJob(
    file: FileProcessingSourceFile,
  ): Promise<void> {
    const correlationId = randomUUID();

    const job = await this.prismaService.fileProcessingJob.create({
      data: {
        fileId: file.id,
        organizationId: file.organizationId,
        correlationId,
      },
    });

    this.rabbitMqPublisher.publishFileProcessingJob({
      jobId: job.id,
      fileId: file.id,
      organizationId: file.organizationId,
      storageKey: file.storageKey,
      correlationId: job.correlationId,
    });
  }
}