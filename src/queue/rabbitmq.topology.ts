import { Channel } from 'amqplib';
import {
  RABBITMQ_DLQ,
  RABBITMQ_DLQ_ROUTING_KEY,
  RABBITMQ_EXCHANGE,
  RABBITMQ_RETRY_MESSAGE_TTL_MS,
  RABBITMQ_QUEUE,
  RABBITMQ_RETRY_QUEUE,
  RABBITMQ_RETRY_ROUTING_KEY,
  RABBITMQ_ROUTING_KEY,
} from './rabbitmq.constants';

export async function assertFileProcessingTopology(
  channel: Channel,
): Promise<void> {
  await channel.assertExchange(RABBITMQ_EXCHANGE, 'direct', {
    durable: true,
  });

  await channel.assertQueue(RABBITMQ_QUEUE, {
    durable: true,
  });

  await channel.bindQueue(
    RABBITMQ_QUEUE,
    RABBITMQ_EXCHANGE,
    RABBITMQ_ROUTING_KEY,
  );

  await channel.assertQueue(RABBITMQ_RETRY_QUEUE, {
    durable: true,
    arguments: {
      'x-message-ttl': RABBITMQ_RETRY_MESSAGE_TTL_MS,
      'x-dead-letter-exchange': RABBITMQ_EXCHANGE,
      'x-dead-letter-routing-key': RABBITMQ_ROUTING_KEY,
    },
  });

  await channel.bindQueue(
    RABBITMQ_RETRY_QUEUE,
    RABBITMQ_EXCHANGE,
    RABBITMQ_RETRY_ROUTING_KEY,
  );

  await channel.assertQueue(RABBITMQ_DLQ, {
    durable: true,
  });

  await channel.bindQueue(
    RABBITMQ_DLQ,
    RABBITMQ_EXCHANGE,
    RABBITMQ_DLQ_ROUTING_KEY,
  );
}
