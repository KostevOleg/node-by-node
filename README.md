# Node by Node

Node by Node is a NestJS REST API backed by PostgreSQL and Prisma. The API
models organizations, users, sessions, conversations, messages, and
organization-scoped files, and exposes CRUD endpoints for the main platform
resources.

## How to Run the Application

Create `.env` from `.env.example`, then run:

```bash
yarn install
yarn prisma:generate
yarn start:dev
```

Application URL: `http://localhost:3000`
Swagger UI: `http://localhost:3000/api/docs`

For local development, PostgreSQL, MinIO, and ClamAV must be running before file
uploads can work. You can start the required Docker services with:

```bash
docker compose up -d postgres minio clamav
```

On Windows local development, use `CLAMAV_HOST=127.0.0.1` in `.env`.

Then apply migrations and optionally seed test data:

```bash
yarn prisma:deploy
yarn seed
```

Start the API in development mode:

```bash
yarn start:dev
```

Open Swagger UI to inspect and test the API:

```text
http://localhost:3000/api/docs
```

In Swagger UI, expand a resource, click `Try it out`, fill query parameters or
request body fields, and execute the request.

## REST API Resources

The public REST API contains CRUD endpoints for these resources:

| Resource | Base URL | Notes |
| --- | --- | --- |
| Organizations | `/organizations` | Company or workspace records. |
| Users | `/users` | Users belong to organizations. Sensitive fields are not returned. |
| Sessions | `/sessions` | User session records. Token hashes are not returned. |
| Conversations | `/conversations` | Conversation records owned by users. |
| Messages | `/messages` | Messages that belong to conversations. |
| Files | `/files` | Organization-scoped upload, list, download, and delete. |

Collection endpoints support cursor pagination with:

- `take`: page size from `1` to `100`.
- `cursor`: UUID of the last item from the previous page.

Example:

```http
GET /messages?take=50
```

The response shape for paginated endpoints is:

```json
{
  "data": [],
  "nextCursor": null
}
```

## Validation and Error Handling

Request bodies, route parameters, and query parameters are validated with DTOs
and NestJS validation pipes. Invalid input returns `400 Bad Request` with a
standard error envelope.

The API uses one consistent error response format for validation errors,
missing resources, unique constraint conflicts, and unexpected failures. The
format and examples are documented in `docs/error-handling.md`.

## Response Serialization

API responses use explicit Prisma `select` objects to return public response
fields only. Internal and sensitive fields such as `passwordHash`,
`refreshTokenHash`, and `deletedAt` are excluded from normal API responses.

## Database Migrations

Set `DATABASE_URL` in `.env`, then run:

```bash
yarn prisma:migrate
```

For Docker/production-style startup, apply existing migrations with:

```bash
yarn prisma:deploy
```

## Database Seeding

After PostgreSQL is running and migrations are applied, populate the database
with test data:

```bash
yarn seed
```

On Windows PowerShell, if `yarn` is blocked by execution policy, use:

```bash
yarn.cmd seed
```

The seed script creates organizations, users, sessions for active users,
conversations, and messages for performance testing.

## Project Documentation

- Swagger/OpenAPI UI: `http://localhost:3000/api/docs`
- Database design and relationships: `docs/database-design.md`
- Query analysis, indexes, pagination, and transactions: `docs/query-analysis.md`
- Error response format and examples: `docs/error-handling.md`
- JSON payload performance notes: `docs/json-performance.md`

## How to Start Docker Services

```bash
docker compose up --build
```

```bash
docker compose down
```

Docker starts the NestJS app, PostgreSQL, Redis, RabbitMQ, MinIO, and ClamAV.
RabbitMQ UI is available at `http://localhost:15672`.
MinIO Console is available at `http://localhost:9001`.

## How to Run Tests

```bash
yarn test
```

## Code Quality

Run ESLint and auto-fix issues:

```bash
yarn lint
```

Check ESLint without changing files:

```bash
yarn lint:check
```

Format source and test files with Prettier:

```bash
yarn format
```

Check Prettier formatting without changing files:

```bash
yarn format:check
```
