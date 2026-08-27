import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from 'src/prisma/prisma-service';
import { DocumentProcessingPublisher } from 'src/queue/document-processing/publisher';

type RagIngestionSourceFile = {
  id: string;
  organizationId: string;
  storageKey: string;
};

type RagIngestionPrismaClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class RagIngestionProducer {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly documentProcessingPublisher: DocumentProcessingPublisher,
  ) {}

  async enqueueRagIngestionJob(
    file: RagIngestionSourceFile,
    prisma: RagIngestionPrismaClient = this.prismaService,
  ): Promise<void> {
    const correlationId = randomUUID();

    const job = await prisma.ragIngestionJob.create({
      data: {
        fileId: file.id,
        organizationId: file.organizationId,
        correlationId,
      },
    });

    this.documentProcessingPublisher.publishRagIngestionJob({
      jobId: job.id,
      fileId: file.id,
      organizationId: file.organizationId,
      storageKey: file.storageKey,
      correlationId: job.correlationId,
    });
  }
}
