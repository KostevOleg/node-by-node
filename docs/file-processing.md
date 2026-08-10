# Asynchronous File Processing

The file processing flow handles sales `.xlsx` files outside the main API
request. The API saves the uploaded file and sends a RabbitMQ message. A
separate NestJS worker consumes the message and processes the file in the
background.

## Message Flow

1. The user uploads a file through `POST /files?processSales=true`.
2. The API validates the upload and scans it with ClamAV.
3. The API stores the file in object storage.
4. The API creates a `FileProcessingJob` with status `PENDING`.
5. The API publishes a persistent RabbitMQ message with a `correlationId`.
6. The worker consumes the message from `file.processing.queue`.
7. The worker marks the job as `PROCESSING`.
8. The worker downloads the file from object storage.
9. The worker parses the Excel file and requires these columns:
   - `quantity`
   - `unitPrice`
10. The worker saves `totalQuantity`, `totalRevenue`, and status `COMPLETED`.
11. The worker ACKs the RabbitMQ message.

## Failure Handling

- Invalid Excel files fail the job and are ACKed because retrying will not fix
  the file.
- Temporary processing failures are retried through the retry queue.
- After the maximum number of attempts, the message is published to the
  dead-letter queue and the job is marked `FAILED`.
- Failed jobs store the error text in `FileProcessingJob.errorMessage`.

## Duplicate Handling

Each file can have only one processing job because `FileProcessingJob.fileId` is
unique. The worker also skips jobs that are already `COMPLETED` or `FAILED`, so
repeated messages do not create duplicate processing results.

## Local Verification

Start infrastructure and the worker:

```bash
docker compose up -d postgres redis rabbitmq minio clamav worker
```

Start the API locally:

```bash
yarn start:dev
```

Use Swagger at `http://localhost:3000/api/docs`:

1. Sign in with `POST /auth/sign-in`.
2. Click `Authorize` and paste the returned `accessToken`.
3. Upload an `.xlsx` file with `POST /files?processSales=true`.

Check the worker logs:

```bash
docker compose logs worker --tail 100
```

Successful processing logs a message like:

```text
Processed file processing job <job-id>
```

Check the database result:

```bash
docker exec -it node_by_node_postgres psql -U postgres -d node_by_node
```

```sql
select id, "fileId", status, attempts, "totalQuantity", "totalRevenue",
  "errorMessage", "completedAt"
from "FileProcessingJob"
order by "createdAt" desc
limit 5;
```
