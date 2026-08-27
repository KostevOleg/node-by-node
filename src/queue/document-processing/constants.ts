export const DOCUMENT_PROCESSING_EXCHANGE = 'document.processing.exchange';

export const SALES_PROCESSING_QUEUE = 'file.processing.queue';
export const SALES_PROCESSING_RETRY_QUEUE = 'file.processing.retry.queue';
export const SALES_PROCESSING_DLQ = 'file.processing.dlq';

export const SALES_PROCESSING_ROUTING_KEY = 'sales.processing.requested';
export const SALES_PROCESSING_RETRY_ROUTING_KEY = 'sales.processing.retry';
export const SALES_PROCESSING_DLQ_ROUTING_KEY = 'sales.processing.failed';

export const SALES_PROCESSING_RETRY_MESSAGE_TTL_MS = 10_000;
export const SALES_PROCESSING_MAX_ATTEMPTS = 3;

export const RAG_INGESTION_QUEUE = 'rag.ingestion.queue';

export const RAG_INGESTION_RETRY_3M_QUEUE = 'rag.ingestion.retry.3m.queue';
export const RAG_INGESTION_RETRY_15M_QUEUE = 'rag.ingestion.retry.15m.queue';
export const RAG_INGESTION_RETRY_2H_QUEUE = 'rag.ingestion.retry.2h.queue';

export const RAG_INGESTION_DLQ = 'rag.ingestion.dlq';

export const RAG_INGESTION_ROUTING_KEY = 'rag.ingestion.requested';
export const RAG_INGESTION_RETRY_3M_ROUTING_KEY = 'rag.ingestion.retry.3m';
export const RAG_INGESTION_RETRY_15M_ROUTING_KEY = 'rag.ingestion.retry.15m';
export const RAG_INGESTION_RETRY_2H_ROUTING_KEY = 'rag.ingestion.retry.2h';
export const RAG_INGESTION_DLQ_ROUTING_KEY = 'rag.ingestion.failed';

export const RAG_RETRY_MESSAGE_TTL_3M_MS = 180_000;
export const RAG_RETRY_MESSAGE_TTL_15M_MS = 900_000;
export const RAG_RETRY_MESSAGE_TTL_2H_MS = 7_200_000;

export const RAG_MAX_INGESTION_ATTEMPTS = 4;
