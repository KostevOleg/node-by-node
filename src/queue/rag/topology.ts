import { Channel } from 'amqplib';
import {
  RAG_EXCHANGE,
  RAG_INGESTION_DLQ,
  RAG_INGESTION_DLQ_ROUTING_KEY,
  RAG_INGESTION_QUEUE,
  RAG_INGESTION_RETRY_3M_QUEUE,
  RAG_INGESTION_RETRY_3M_ROUTING_KEY,
  RAG_INGESTION_RETRY_15M_QUEUE,
  RAG_INGESTION_RETRY_15M_ROUTING_KEY,
  RAG_INGESTION_RETRY_2H_QUEUE,
  RAG_INGESTION_RETRY_2H_ROUTING_KEY,
  RAG_INGESTION_ROUTING_KEY,
  RAG_RETRY_MESSAGE_TTL_3M_MS,
  RAG_RETRY_MESSAGE_TTL_15M_MS,
  RAG_RETRY_MESSAGE_TTL_2H_MS,
} from './constants';

async function assertRetryQueue(
  channel: Channel,
  queue: string,
  routingKey: string,
  ttlMs: number,
): Promise<void> {
  await channel.assertQueue(queue, {
    durable: true,
    arguments: {
      'x-message-ttl': ttlMs,
      'x-dead-letter-exchange': RAG_EXCHANGE,
      'x-dead-letter-routing-key': RAG_INGESTION_ROUTING_KEY,
    },
  });

  await channel.bindQueue(queue, RAG_EXCHANGE, routingKey);
}

export async function assertRagIngestionTopology(
  channel: Channel,
): Promise<void> {
  await channel.assertExchange(RAG_EXCHANGE, 'direct', {
    durable: true,
  });

  await channel.assertQueue(RAG_INGESTION_QUEUE, {
    durable: true,
  });

  await channel.bindQueue(
    RAG_INGESTION_QUEUE,
    RAG_EXCHANGE,
    RAG_INGESTION_ROUTING_KEY,
  );

  await assertRetryQueue(
    channel,
    RAG_INGESTION_RETRY_3M_QUEUE,
    RAG_INGESTION_RETRY_3M_ROUTING_KEY,
    RAG_RETRY_MESSAGE_TTL_3M_MS,
  );

  await assertRetryQueue(
    channel,
    RAG_INGESTION_RETRY_15M_QUEUE,
    RAG_INGESTION_RETRY_15M_ROUTING_KEY,
    RAG_RETRY_MESSAGE_TTL_15M_MS,
  );

  await assertRetryQueue(
    channel,
    RAG_INGESTION_RETRY_2H_QUEUE,
    RAG_INGESTION_RETRY_2H_ROUTING_KEY,
    RAG_RETRY_MESSAGE_TTL_2H_MS,
  );

  await channel.assertQueue(RAG_INGESTION_DLQ, {
    durable: true,
  });

  await channel.bindQueue(
    RAG_INGESTION_DLQ,
    RAG_EXCHANGE,
    RAG_INGESTION_DLQ_ROUTING_KEY,
  );
}
