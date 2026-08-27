import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { Channel, ChannelModel } from 'amqplib';
import { FileProcessingJobMessage } from 'src/file-processing/messages/file-processing-job.message';
import { RagIngestionJobMessage } from 'src/rag/messages/rag-ingestion-job.message';
import {
  DOCUMENT_PROCESSING_EXCHANGE,
  RAG_INGESTION_ROUTING_KEY,
  SALES_PROCESSING_ROUTING_KEY,
} from './constants';
import { assertDocumentProcessingTopology } from './topology';

type DocumentProcessingMessage =
  | FileProcessingJobMessage
  | RagIngestionJobMessage;

@Injectable()
export class DocumentProcessingPublisher
  implements OnModuleInit, OnModuleDestroy
{
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.getOrThrow<string>('RABBITMQ_URL');

    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();

    await assertDocumentProcessingTopology(this.channel);
  }

  publishFileProcessingJob(message: FileProcessingJobMessage): void {
    this.publish(SALES_PROCESSING_ROUTING_KEY, message);
  }

  publishRagIngestionJob(message: RagIngestionJobMessage): void {
    this.publish(RAG_INGESTION_ROUTING_KEY, message);
  }

  private publish(
    routingKey: string,
    message: DocumentProcessingMessage,
  ): void {
    if (!this.channel) {
      throw new ServiceUnavailableException('RabbitMQ channel is not ready');
    }

    this.channel.publish(
      DOCUMENT_PROCESSING_EXCHANGE,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        contentType: 'application/json',
        correlationId: message.correlationId,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}
