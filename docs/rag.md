# RAG Document Q&A

## Overview

The RAG feature allows users to upload documents and ask questions about their
content. RAG processing is separated from the main API and runs as a dedicated
RabbitMQ-based background worker service.

The main API handles HTTP requests, file validation, access checks, and proxying
RAG requests. The RAG worker handles parsing, chunking, embeddings, Qdrant
storage, retrieval, and LLM answer generation.

## Architecture

```text
User -> Core API -> PostgreSQL / MinIO -> OutboxMessage
Outbox Worker -> RabbitMQ -> RAG Worker -> OpenAI / Qdrant
```

Question answering uses RabbitMQ RPC:

```text
User -> Core API -> RabbitMQ -> RAG Worker -> Qdrant + LLM -> Core API
```

Main components:

- Core API: exposes upload, status, list, and question endpoints.
- Outbox worker: publishes pending outbox messages to RabbitMQ.
- RAG worker: processes ingestion and answer requests.
- RabbitMQ: connects the core API and workers.
- MinIO: stores uploaded files.
- Qdrant: stores document chunk embeddings and metadata.
- OpenAI: generates embeddings and answers.

## Ingestion Flow

1. A user uploads a `.txt`, `.md`, or `.pdf` file with:

```http
POST /files?processRag=true
```

2. The Core API validates and stores the file, then creates:

- `OrganizationFile`
- `RagIngestionJob` with status `PENDING`
- `OutboxMessage`

3. The Outbox Worker publishes the ingestion message to RabbitMQ.
4. The RAG Worker consumes the message and changes the job to `PROCESSING`.
5. The RAG Worker parses the document, splits it into chunks, generates
   embeddings, and stores chunks with metadata in Qdrant.
6. The job becomes `COMPLETED` or `FAILED`.

## Question Answering Flow

1. A user asks a question:

```http
POST /rag/files/:fileId/ask
```

2. The Core API checks that the file belongs to the user organization and that
   ingestion is completed.
3. The Core API sends a RabbitMQ RPC request to the RAG Worker.
4. The RAG Worker embeds the question, searches relevant chunks in Qdrant, builds
   a grounded prompt, and generates an answer.
5. The response includes the generated answer and source citations.

## API

```http
POST /files?processRag=true
GET /rag/files
GET /rag/files/:fileId/status
POST /rag/files/:fileId/ask
```

Supported document types:

```text
.txt
.md
.pdf
```

RAG job statuses:

```text
PENDING
PROCESSING
COMPLETED
FAILED
```

## Reliability

The ingestion pipeline is designed for repeated message delivery:

- each file has one RAG ingestion job;
- already completed jobs are skipped if the message is delivered again;
- existing Qdrant chunks for the file are deleted before re-indexing;
- transient ingestion failures are retried through RabbitMQ retry queues;
- the outbox pattern reduces the risk of losing queue messages after upload.

## Hallucination Reduction

Answer generation uses only retrieved document chunks as context. The prompt
instructs the model to say when the document does not contain enough information.
The API also returns source citations for the chunks used during generation.

## Running Locally

Start required services:

```bash
docker compose up -d postgres rabbitmq minio clamav qdrant
```

Start the API and workers:

```bash
yarn start:dev
yarn start:outbox-worker:dev
yarn start:rag-worker:dev
```

Or run everything with Docker:

```bash
docker compose up --build
```
