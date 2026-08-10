import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { RabbitMqPublisher } from 'src/queue/rabbitmq.publisher';
import { PrismaService } from 'src/prisma/prisma-service';

type FileProcessingSourceFile = {
  id: string;
  organizationId: string;
  storageKey: string;
};

type FileProcessingPrismaClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class FileProcessingProducer {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly rabbitMqPublisher: RabbitMqPublisher,
  ) {}

  async enqueueFileProcessingJob(
    file: FileProcessingSourceFile,
    prisma: FileProcessingPrismaClient = this.prismaService,
  ): Promise<void> {
    const correlationId = randomUUID();

    const job = await prisma.fileProcessingJob.create({
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
