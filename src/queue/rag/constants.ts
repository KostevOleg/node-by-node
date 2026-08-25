export const RAG_EXCHANGE = 'rag.exchange';

export const RAG_INGESTION_QUEUE = 'rag.ingestion.queue';

export const RAG_INGESTION_RETRY_3M_QUEUE = 'rag.ingestion.retry.3m.queue';
export const RAG_INGESTION_RETRY_15M_QUEUE =
  'rag.ingestion.retry.15m.queue';
export const RAG_INGESTION_RETRY_2H_QUEUE =
  'rag.ingestion.retry.2h.queue';

export const RAG_INGESTION_DLQ = 'rag.ingestion.dlq';

export const RAG_INGESTION_ROUTING_KEY = 'rag.document.ingest';
export const RAG_INGESTION_RETRY_3M_ROUTING_KEY = 'rag.document.retry.3m';
export const RAG_INGESTION_RETRY_15M_ROUTING_KEY = 'rag.document.retry.15m';
export const RAG_INGESTION_RETRY_2H_ROUTING_KEY = 'rag.document.retry.2h';
export const RAG_INGESTION_DLQ_ROUTING_KEY = 'rag.document.failed';

export const RAG_RETRY_MESSAGE_TTL_3M_MS = 180_000;
export const RAG_RETRY_MESSAGE_TTL_15M_MS = 900_000;
export const RAG_RETRY_MESSAGE_TTL_2H_MS = 7_200_000;

export const RAG_MAX_INGESTION_ATTEMPTS = 4;
