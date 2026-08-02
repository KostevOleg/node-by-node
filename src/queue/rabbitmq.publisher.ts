import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { Channel, ChannelModel } from 'amqplib';
import { FileProcessingJobMessage } from 'src/file-processing/messages/file-processing-job.message';
import {
  RABBITMQ_EXCHANGE,
  RABBITMQ_QUEUE,
  RABBITMQ_ROUTING_KEY,
} from './rabbitmq.constants';

@Injectable()
export class RabbitMqPublisher implements OnModuleInit, OnModuleDestroy {
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.getOrThrow<string>('RABBITMQ_URL');

    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();

    await this.channel.assertExchange(RABBITMQ_EXCHANGE, 'direct', {
      durable: true,
    });

    await this.channel.assertQueue(RABBITMQ_QUEUE, {
      durable: true,
    });

    await this.channel.bindQueue(
      RABBITMQ_QUEUE,
      RABBITMQ_EXCHANGE,
      RABBITMQ_ROUTING_KEY,
    );
  }

  publishFileProcessingJob(message: FileProcessingJobMessage): void {
    if (!this.channel) {
      throw new ServiceUnavailableException('RabbitMQ channel is not ready');
    }

    this.channel.publish(
      RABBITMQ_EXCHANGE,
      RABBITMQ_ROUTING_KEY,
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
