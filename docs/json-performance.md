# JSON Payload Performance

This document describes the JSON payload optimizations applied to collection
endpoints that can return larger responses.

## Goal

The goal is to keep API responses predictable as the database grows. The largest
risk is returning unbounded arrays or nested relation graphs, especially for
messages and conversations.

## Tested Endpoints

The main endpoint analyzed for payload size risk is:

```http
GET /messages
```

Messages are the highest-risk collection because the table can grow quickly and
each record includes the `content` field.

The same optimization pattern is also applied to other collection endpoints:

```http
GET /users
GET /organizations
GET /sessions
GET /conversations
```

Scoped service methods use the same pagination approach for parent-child lists,
such as organization users, user conversations, and conversation messages.

## Performance Observations

Unbounded collection responses are risky because response size grows linearly
with the number of rows in the database.

For example, returning all messages at once would make the response larger every
time more conversation history is stored. This increases network transfer size,
JSON serialization work, and client-side parsing cost.

List endpoints also do not need internal fields or nested relation graphs for
the default response. Returning only the fields needed by API consumers keeps the
payload predictable and easier to process.

## Optimizations Applied

### Cursor Pagination

Collection endpoints now use cursor pagination with `take` and `cursor` query
parameters.

Example request:

```http
GET /messages?take=50
```

Example response shape:

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "conversationId": "550e8400-e29b-41d4-a716-446655440001",
      "sender": "USER",
      "content": "Hello",
      "status": "SENT",
      "tokenCount": 3,
      "createdAt": "2026-07-08T12:00:00.000Z",
      "updatedAt": "2026-07-08T12:00:00.000Z"
    }
  ],
  "nextCursor": "550e8400-e29b-41d4-a716-446655440000"
}
```

The service requests `take + 1` records from the database. The extra record is
used only to detect whether another page exists. The API returns at most `take`
records to the client.

The `PaginationDto` validates query parameters:

- `take` must be an integer between `1` and `100`.
- `cursor`, when provided, must be a UUID.

### Public Field Selection

Prisma `select` objects are used to return only public response fields.

This avoids returning internal or sensitive fields such as:

- `passwordHash`
- `refreshTokenHash`
- `deletedAt`

It also reduces JSON size by excluding fields that clients do not need in normal
API responses.

This selection is also the API serialization boundary. The service layer returns
clean public objects instead of raw database records.

### No Nested Includes in List Responses

List endpoints return flat resource objects and do not include nested relation
graphs by default.

For example, `GET /messages` returns message fields without embedding the full
conversation, user, or organization objects.

This avoids large repeated payloads and prevents circular response structures.

### Stable Ordering

Paginated endpoints use stable ordering by `createdAt` and `id`.

Examples:

```ts
orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
```

For conversation messages, chronological order is used:

```ts
orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
```

Stable ordering makes cursor pagination predictable across pages.

## Results

The optimized endpoints now return bounded JSON pages instead of unbounded
arrays.

Postman was used to verify the `GET /messages` endpoint with different page
sizes:

| Request | Status | Response time | Observation |
| --- | --- | ---: | --- |
| `GET /messages?take=10` | `200 OK` | `723 ms` | Returned a paginated response with `nextCursor`. |
| `GET /messages?take=50` | `200 OK` | `62 ms` | Returned a paginated response with `nextCursor`. |
| `GET /messages?take=100` | `200 OK` | Not recorded | Returned the largest allowed page size. |
| `GET /messages?take=500` | `400 Bad Request` | Not recorded | Rejected by validation because `take` is capped at `100`. |

Results of the implemented changes:

- `GET /messages` returns at most `50` records by default.
- Clients can request smaller pages with `take`.
- Clients can continue pagination with `nextCursor`.
- `take` is capped at `100` to prevent excessively large responses.
- Internal and sensitive fields are excluded from API responses.
- List responses avoid nested relation payloads.

These changes keep response size predictable as the database grows and reduce
unnecessary JSON serialization and transfer work.

## Tradeoffs

Cursor pagination is better for growing datasets than offset pagination, but it
requires clients to keep and send `nextCursor` when loading the next page. This
is acceptable for the API because list endpoints are expected to be consumed by
clients that can store pagination state.

Flat response objects keep payloads small, but clients may need separate
requests when they need related resources. This is intentional for default list
responses because it avoids large repeated JSON structures.
