import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { Channel, ChannelModel } from 'amqplib';
import { RagIngestionJobMessage } from 'src/rag/messages/rag-ingestion-job.message';
import { RAG_EXCHANGE, RAG_INGESTION_ROUTING_KEY } from './constants';
import { assertRagIngestionTopology } from './topology';

@Injectable()
export class RagRabbitMqPublisher implements OnModuleInit, OnModuleDestroy {
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.getOrThrow<string>('RABBITMQ_URL');

    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();

    await assertRagIngestionTopology(this.channel);
  }

  publishRagIngestionJob(message: RagIngestionJobMessage): void {
    if (!this.channel) {
      throw new ServiceUnavailableException('RabbitMQ channel is not ready');
    }

    this.channel.publish(
      RAG_EXCHANGE,
      RAG_INGESTION_ROUTING_KEY,
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
