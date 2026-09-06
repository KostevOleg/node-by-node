import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from 'src/prisma/prisma-service';
import { OutboxService } from 'src/outbox/outbox.service';
import {
  DOCUMENT_PROCESSING_EXCHANGE,
  SALES_PROCESSING_ROUTING_KEY,
} from 'src/queue/document-processing/constants';

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
    private readonly outboxService: OutboxService,
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

    await this.outboxService.enqueue(
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
      prisma,
    );
  }
}
