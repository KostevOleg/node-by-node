import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { ConfirmChannel, ChannelModel } from 'amqplib';
import { FileProcessingJobMessage } from 'src/file-processing/messages/file-processing-job.message';
import { RagIngestionJobMessage } from 'src/rag/ingestion/messages/rag-ingestion-job.message';
import { RagIngestionStatusChangedMessage } from 'src/rag/ingestion/messages/rag-ingestion-status-changed.message';
import {
  DOCUMENT_PROCESSING_EXCHANGE,
  RAG_INGESTION_ROUTING_KEY,
  RAG_INGESTION_STATUS_CHANGED_ROUTING_KEY,
  SALES_PROCESSING_ROUTING_KEY,
} from './constants';
import { assertDocumentProcessingTopology } from './topology';

type OutboxDocumentProcessingMessage = {
  exchange: string;
  routingKey: string;
  payload: unknown;
};

@Injectable()
export class DocumentProcessingPublisher
  implements OnModuleInit, OnModuleDestroy
{
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.getOrThrow<string>('RABBITMQ_URL');

    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createConfirmChannel();

    await assertDocumentProcessingTopology(this.channel);
  }

  async publishFileProcessingJob(
    message: FileProcessingJobMessage,
  ): Promise<void> {
    await this.publish(
      DOCUMENT_PROCESSING_EXCHANGE,
      SALES_PROCESSING_ROUTING_KEY,
      message,
    );
  }

  async publishRagIngestionJob(message: RagIngestionJobMessage): Promise<void> {
    await this.publish(
      DOCUMENT_PROCESSING_EXCHANGE,
      RAG_INGESTION_ROUTING_KEY,
      message,
    );
  }

  async publishRagIngestionStatusChanged(
    message: RagIngestionStatusChangedMessage,
  ): Promise<void> {
    await this.publish(
      DOCUMENT_PROCESSING_EXCHANGE,
      RAG_INGESTION_STATUS_CHANGED_ROUTING_KEY,
      message,
    );
  }

  async publishOutboxMessage(
    message: OutboxDocumentProcessingMessage,
  ): Promise<void> {
    await this.publish(message.exchange, message.routingKey, message.payload);
  }

  private publish(
    exchange: string,
    routingKey: string,
    message: unknown,
  ): Promise<void> {
    if (!this.channel) {
      throw new ServiceUnavailableException('RabbitMQ channel is not ready');
    }

    const channel = this.channel;

    return new Promise((resolve, reject) => {
      channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
          contentType: 'application/json',
          correlationId: this.getCorrelationId(message),
        },
        (error) => {
          if (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
            return;
          }

          resolve();
        },
      );
    });
  }

  private getCorrelationId(message: unknown): string | undefined {
    if (
      typeof message === 'object' &&
      message !== null &&
      'correlationId' in message &&
      typeof message.correlationId === 'string'
    ) {
      return message.correlationId;
    }

    return undefined;
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}
