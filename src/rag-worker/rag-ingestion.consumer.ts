import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileProcessingStatus } from '@prisma/client';
import amqp, { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { Readable } from 'node:stream';
import { ObjectStorageService } from 'src/files/storage/object-storage.service';
import { PrismaService } from 'src/prisma/prisma-service';
import {
  DOCUMENT_PROCESSING_EXCHANGE,
  RAG_INGESTION_DLQ_ROUTING_KEY,
  RAG_INGESTION_QUEUE,
  RAG_MAX_INGESTION_ATTEMPTS,
  RAG_INGESTION_RETRY_3M_ROUTING_KEY,
  RAG_INGESTION_RETRY_15M_ROUTING_KEY,
  RAG_INGESTION_RETRY_2H_ROUTING_KEY,
} from 'src/queue/document-processing/constants';
import { assertDocumentProcessingTopology } from 'src/queue/document-processing/topology';
import { DocumentParserService } from 'src/rag/document-parser.service';
import { RagIngestionJobMessage } from 'src/rag/messages/rag-ingestion-job.message';
import { TextChunkerService } from 'src/rag/text-chunker.service';
import { EmbeddingService } from 'src/rag/embedding.service';
import { QdrantVectorStoreService } from 'src/rag/qdrant-vector-store.service';

@Injectable()
export class RagIngestionConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RagIngestionConsumer.name);
  private channel?: Channel;
  private connection?: ChannelModel;

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly objectStorageService: ObjectStorageService,
    private readonly documentParserService: DocumentParserService,
    private readonly textChunkerService: TextChunkerService,
    private readonly embeddingService: EmbeddingService,
    private readonly qdrantStoreService: QdrantVectorStoreService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.getOrThrow<string>('RABBITMQ_URL');

    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();

    await assertDocumentProcessingTopology(this.channel);

    await this.channel.prefetch(1);
    await this.channel.consume(RAG_INGESTION_QUEUE, (message) => {
      void this.handleMessage(message);
    });

    this.logger.log('RAG ingestion consumer started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  private async handleMessage(message: ConsumeMessage | null): Promise<void> {
    if (!message || !this.channel) {
      return;
    }

    let jobMessage: RagIngestionJobMessage | undefined;

    try {
      jobMessage = this.parseMessage(message);

      const job = await this.getIngestionJob(jobMessage);

      if (job.status === FileProcessingStatus.COMPLETED) {
        this.channel.ack(message);
        this.logger.log(
          `Skipping already completed RAG ingestion job ${jobMessage.jobId} correlationId=${jobMessage.correlationId}`,
        );
        return;
      }

      if (job.status === FileProcessingStatus.FAILED) {
        this.channel.ack(message);
        this.logger.log(
          `Skipping already failed RAG ingestion job ${jobMessage.jobId} correlationId=${jobMessage.correlationId}`,
        );
        return;
      }

      await this.markJobAsProcessing(jobMessage);

      const object = await this.objectStorageService.getObject(
        job.file.storageKey,
      );
      const buffer = await this.streamToBuffer(object.body);
      const text = await this.documentParserService.parse(
        buffer,
        job.file.extension,
      );
      const chunks = this.textChunkerService.split(text);
      const vectors = await this.embeddingService.embedTexts(chunks);
      await this.qdrantStoreService.upsertChunks({
        chunks,
        vectors,
        organizationId: job.organizationId,
        fileId: job.fileId,
        jobId: job.id,
        sourceName: job.file.originalName,
        extension: job.file.extension,
      });

      const result = await this.prismaService.ragIngestionJob.updateMany({
        where: {
          id: jobMessage.jobId,
          status: FileProcessingStatus.PROCESSING,
        },
        data: {
          status: FileProcessingStatus.COMPLETED,
          chunksCount: chunks.length,
          embeddingModel: this.embeddingService.model,
          qdrantCollection: this.qdrantStoreService.collection,
          completedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new Error(
          `RAG ingestion job ${jobMessage.jobId} is not processing`,
        );
      }

      this.channel.ack(message);
      this.logger.log(
        `Processed RAG ingestion job ${jobMessage.jobId} correlationId=${jobMessage.correlationId}`,
      );
    } catch (error) {
      await this.handleProcessingFailure(message, jobMessage, error);
    }
  }

  private parseMessage(message: ConsumeMessage): RagIngestionJobMessage {
    return JSON.parse(message.content.toString()) as RagIngestionJobMessage;
  }

  private async getIngestionJob(message: RagIngestionJobMessage) {
    const job = await this.prismaService.ragIngestionJob.findUnique({
      where: { id: message.jobId },
      include: { file: true },
    });

    if (!job) {
      throw new BadRequestException(
        `RAG ingestion job ${message.jobId} was not found`,
      );
    }

    if (
      job.fileId !== message.fileId ||
      job.organizationId !== message.organizationId
    ) {
      throw new BadRequestException(
        `RAG ingestion job ${message.jobId} payload mismatch`,
      );
    }

    if (job.file.deletedAt) {
      throw new BadRequestException(`File ${message.fileId} was deleted`);
    }

    if (!['.txt', '.md', '.pdf'].includes(job.file.extension)) {
      throw new BadRequestException(
        `File ${message.fileId} is not a supported RAG document`,
      );
    }

    return job;
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Uint8Array[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  private async markJobAsProcessing(
    message: RagIngestionJobMessage,
  ): Promise<void> {
    const result = await this.prismaService.ragIngestionJob.updateMany({
      where: {
        id: message.jobId,
        fileId: message.fileId,
        status: {
          in: [FileProcessingStatus.PENDING, FileProcessingStatus.PROCESSING],
        },
      },
      data: {
        status: FileProcessingStatus.PROCESSING,
        startedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new Error(`RAG ingestion job ${message.jobId} is not pending`);
    }
  }

  private async markJobAsFailed(
    message: RagIngestionJobMessage | undefined,
    error: unknown,
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (message) {
      await this.prismaService.ragIngestionJob.updateMany({
        where: {
          id: message.jobId,
          status: {
            not: FileProcessingStatus.COMPLETED,
          },
        },
        data: {
          status: FileProcessingStatus.FAILED,
          failedAt: new Date(),
          errorMessage,
        },
      });
    }

    this.logger.error(
      message
        ? `RAG ingestion job failed ${message.jobId} correlationId=${message.correlationId}`
        : 'RAG ingestion job failed',
      errorMessage,
    );
  }

  private async handleProcessingFailure(
    message: ConsumeMessage,
    jobMessage: RagIngestionJobMessage | undefined,
    error: unknown,
  ): Promise<void> {
    if (!jobMessage) {
      this.publishMessage(message, RAG_INGESTION_DLQ_ROUTING_KEY);
      this.channel?.ack(message);
      return;
    }

    if (this.isPermanentProcessingError(error)) {
      await this.markJobAsFailed(jobMessage, error);
      this.channel?.ack(message);
      return;
    }

    const attempts = await this.incrementJobAttempts(jobMessage, error);
    if (attempts < RAG_MAX_INGESTION_ATTEMPTS) {
      await this.markJobAsPending(jobMessage, error);
      const retryRoutingKey = this.getRetryRoutingKey(attempts);
      this.publishMessage(message, retryRoutingKey);
      this.channel?.ack(message);

      return;
    }

    await this.markJobAsFailed(jobMessage, error);
    this.publishMessage(message, RAG_INGESTION_DLQ_ROUTING_KEY);
    this.channel?.ack(message);
  }

  private isPermanentProcessingError(error: unknown): boolean {
    return error instanceof BadRequestException;
  }

  private async incrementJobAttempts(
    message: RagIngestionJobMessage | undefined,
    error: unknown,
  ): Promise<number> {
    if (!message) {
      return 1;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    const job = await this.prismaService.ragIngestionJob.update({
      where: { id: message.jobId },
      data: {
        attempts: {
          increment: 1,
        },
        errorMessage,
      },
      select: {
        attempts: true,
      },
    });

    return job.attempts;
  }

  private publishMessage(message: ConsumeMessage, routingKey: string): void {
    const contentType =
      typeof message.properties.contentType === 'string'
        ? message.properties.contentType
        : undefined;
    const correlationId =
      typeof message.properties.correlationId === 'string'
        ? message.properties.correlationId
        : undefined;

    this.channel?.publish(
      DOCUMENT_PROCESSING_EXCHANGE,
      routingKey,
      message.content,
      {
        persistent: true,
        contentType,
        correlationId,
      },
    );
  }

  private async markJobAsPending(
    message: RagIngestionJobMessage | undefined,
    error: unknown,
  ): Promise<void> {
    if (!message) {
      return;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    await this.prismaService.ragIngestionJob.updateMany({
      where: {
        id: message.jobId,
        status: FileProcessingStatus.PROCESSING,
      },
      data: {
        status: FileProcessingStatus.PENDING,
        errorMessage,
      },
    });
  }

  private getRetryRoutingKey(attempts: number): string {
    if (attempts === 1) {
      return RAG_INGESTION_RETRY_3M_ROUTING_KEY;
    }

    if (attempts === 2) {
      return RAG_INGESTION_RETRY_15M_ROUTING_KEY;
    }

    return RAG_INGESTION_RETRY_2H_ROUTING_KEY;
  }
}
