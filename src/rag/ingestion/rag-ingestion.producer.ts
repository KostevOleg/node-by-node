import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from 'src/prisma/prisma-service';
import { OutboxService } from 'src/outbox/outbox.service';
import {
  DOCUMENT_PROCESSING_EXCHANGE,
  RAG_INGESTION_ROUTING_KEY,
} from 'src/queue/document-processing/constants';

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
    private readonly outboxService: OutboxService,
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

    await this.outboxService.enqueue(
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
      prisma,
    );
  }
}
