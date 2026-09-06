import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { RAG_INGESTION_STATUS_EVENTS_QUEUE } from 'src/queue/document-processing/constants';
import { assertDocumentProcessingTopology } from 'src/queue/document-processing/topology';
import { RagIngestionStatusChangedMessage } from '../ingestion/messages/rag-ingestion-status-changed.message';
import { RagRealtimeService } from './rag-realtime.service';

@Injectable()
export class RagStatusEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RagStatusEventsConsumer.name);
  private channel?: Channel;
  private connection?: ChannelModel;

  constructor(
    private readonly configService: ConfigService,
    private readonly ragRealtimeService: RagRealtimeService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.getOrThrow<string>('RABBITMQ_URL');

    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      await assertDocumentProcessingTopology(this.channel);
      await this.channel.consume(
        RAG_INGESTION_STATUS_EVENTS_QUEUE,
        (message) => {
          this.handleMessage(message);
        },
      );

      this.logger.log('RAG status events consumer started');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.warn(`RAG status events consumer disabled: ${errorMessage}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  private handleMessage(message: ConsumeMessage | null): void {
    if (!message || !this.channel) {
      return;
    }

    try {
      const statusChanged = JSON.parse(
        message.content.toString(),
      ) as RagIngestionStatusChangedMessage;

      this.ragRealtimeService.broadcastStatusChanged(statusChanged);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to handle RAG status event', errorMessage);
    } finally {
      this.channel.ack(message);
    }
  }
}
