import { Channel } from 'amqplib';
import {
  DOCUMENT_PROCESSING_EXCHANGE,
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
  SALES_PROCESSING_DLQ,
  SALES_PROCESSING_DLQ_ROUTING_KEY,
  SALES_PROCESSING_QUEUE,
  SALES_PROCESSING_RETRY_MESSAGE_TTL_MS,
  SALES_PROCESSING_RETRY_QUEUE,
  SALES_PROCESSING_RETRY_ROUTING_KEY,
  SALES_PROCESSING_ROUTING_KEY,
} from './constants';

async function assertRetryQueue(
  channel: Channel,
  queue: string,
  routingKey: string,
  ttlMs: number,
  deadLetterRoutingKey: string,
): Promise<void> {
  await channel.assertQueue(queue, {
    durable: true,
    arguments: {
      'x-message-ttl': ttlMs,
      'x-dead-letter-exchange': DOCUMENT_PROCESSING_EXCHANGE,
      'x-dead-letter-routing-key': deadLetterRoutingKey,
    },
  });

  await channel.bindQueue(queue, DOCUMENT_PROCESSING_EXCHANGE, routingKey);
}

async function assertSalesProcessingTopology(channel: Channel): Promise<void> {
  await channel.assertQueue(SALES_PROCESSING_QUEUE, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': DOCUMENT_PROCESSING_EXCHANGE,
      'x-dead-letter-routing-key': SALES_PROCESSING_RETRY_ROUTING_KEY,
    },
  });

  await channel.bindQueue(
    SALES_PROCESSING_QUEUE,
    DOCUMENT_PROCESSING_EXCHANGE,
    SALES_PROCESSING_ROUTING_KEY,
  );

  await assertRetryQueue(
    channel,
    SALES_PROCESSING_RETRY_QUEUE,
    SALES_PROCESSING_RETRY_ROUTING_KEY,
    SALES_PROCESSING_RETRY_MESSAGE_TTL_MS,
    SALES_PROCESSING_ROUTING_KEY,
  );

  await channel.assertQueue(SALES_PROCESSING_DLQ, {
    durable: true,
  });

  await channel.bindQueue(
    SALES_PROCESSING_DLQ,
    DOCUMENT_PROCESSING_EXCHANGE,
    SALES_PROCESSING_DLQ_ROUTING_KEY,
  );
}

async function assertRagIngestionTopology(channel: Channel): Promise<void> {
  await channel.assertQueue(RAG_INGESTION_QUEUE, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': DOCUMENT_PROCESSING_EXCHANGE,
      'x-dead-letter-routing-key': RAG_INGESTION_RETRY_3M_ROUTING_KEY,
    },
  });

  await channel.bindQueue(
    RAG_INGESTION_QUEUE,
    DOCUMENT_PROCESSING_EXCHANGE,
    RAG_INGESTION_ROUTING_KEY,
  );

  await assertRetryQueue(
    channel,
    RAG_INGESTION_RETRY_3M_QUEUE,
    RAG_INGESTION_RETRY_3M_ROUTING_KEY,
    RAG_RETRY_MESSAGE_TTL_3M_MS,
    RAG_INGESTION_ROUTING_KEY,
  );

  await assertRetryQueue(
    channel,
    RAG_INGESTION_RETRY_15M_QUEUE,
    RAG_INGESTION_RETRY_15M_ROUTING_KEY,
    RAG_RETRY_MESSAGE_TTL_15M_MS,
    RAG_INGESTION_ROUTING_KEY,
  );

  await assertRetryQueue(
    channel,
    RAG_INGESTION_RETRY_2H_QUEUE,
    RAG_INGESTION_RETRY_2H_ROUTING_KEY,
    RAG_RETRY_MESSAGE_TTL_2H_MS,
    RAG_INGESTION_ROUTING_KEY,
  );

  await channel.assertQueue(RAG_INGESTION_DLQ, {
    durable: true,
  });

  await channel.bindQueue(
    RAG_INGESTION_DLQ,
    DOCUMENT_PROCESSING_EXCHANGE,
    RAG_INGESTION_DLQ_ROUTING_KEY,
  );
}

export async function assertDocumentProcessingTopology(
  channel: Channel,
): Promise<void> {
  await channel.assertExchange(DOCUMENT_PROCESSING_EXCHANGE, 'direct', {
    durable: true,
  });

  await assertSalesProcessingTopology(channel);
  await assertRagIngestionTopology(channel);
}
