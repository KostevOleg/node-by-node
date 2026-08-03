export const RABBITMQ_EXCHANGE = 'file.processing.exchange';

export const RABBITMQ_QUEUE = 'file.processing.queue';
export const RABBITMQ_RETRY_QUEUE = 'file.processing.retry.queue';
export const RABBITMQ_DLQ = 'file.processing.dlq';

export const RABBITMQ_ROUTING_KEY = 'file.processing.requested';
export const RABBITMQ_RETRY_ROUTING_KEY = 'file.processing.retry';
export const RABBITMQ_DLQ_ROUTING_KEY = 'file.processing.failed';

export const RABBITMQ_RETRY_MESSAGE_TTL_MS = 10000;
export const RABBITMQ_MAX_PROCESSING_ATTEMPTS = 3;
