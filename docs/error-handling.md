# Error Handling

The API uses a global NestJS exception filter to return errors in one
consistent JSON format. The shape follows the same idea as Problem Details:
each response includes a machine-readable type, a short title, the HTTP status,
a human-readable detail, and the request instance.

Prisma errors are first converted to NestJS HTTP exceptions by
`prismaErrorHandler`. The global `HttpExceptionFilter` then converts those
exceptions, validation errors, and unexpected errors into the response envelope
described below.

## Implementation

- Global validation is configured in `src/main.ts` with `ValidationPipe`.
- Global exception handling is configured in `src/main.ts` with
  `HttpExceptionFilter`.
- Prisma constraint errors are mapped in
  `src/common/utils/prisma-error.handler.ts`.
- Validation DTOs are defined next to their resources under `src/**/dto`.

## Error Response Format

```json
{
  "type": "https://node-by-node.local/errors/http-404",
  "title": "Not Found",
  "status": 404,
  "detail": "User not found",
  "instance": "/users/550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-07-08T12:00:00.000Z"
}
```

Fields:

- `type`: stable error type URI based on the HTTP status code.
- `title`: short error title.
- `status`: HTTP status code.
- `detail`: human-readable error description.
- `instance`: request URL where the error happened.
- `timestamp`: ISO timestamp generated when the error response is returned.
- `errors`: optional list of validation error messages.

## Validation Error

Invalid request bodies, route parameters, and query parameters return `400 Bad
Request`. Unknown body fields are rejected because the validation pipe uses
`whitelist` and `forbidNonWhitelisted`.

Example request:

```http
GET /users?take=500&cursor=not-a-uuid
```

Example response:

```json
{
  "type": "https://node-by-node.local/errors/http-400",
  "title": "Bad Request",
  "status": 400,
  "detail": "Request validation failed",
  "instance": "/users?take=500&cursor=not-a-uuid",
  "timestamp": "2026-07-08T12:00:00.000Z",
  "errors": [
    {
      "message": "cursor must be a UUID"
    },
    {
      "message": "take must not be greater than 100"
    }
  ]
}
```

## Not Found Error

Missing resources return `404 Not Found`.

Example response:

```json
{
  "type": "https://node-by-node.local/errors/http-404",
  "title": "Not Found",
  "status": 404,
  "detail": "User not found",
  "instance": "/users/550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-07-08T12:00:00.000Z"
}
```

## Conflict Error

Duplicate unique values return `409 Conflict`. For example, creating a user with
an email that already exists is converted from a Prisma unique constraint error
into an HTTP conflict response.

Example response:

```json
{
  "type": "https://node-by-node.local/errors/http-409",
  "title": "Conflict",
  "status": 409,
  "detail": "Duplicate value",
  "instance": "/users",
  "timestamp": "2026-07-08T12:00:00.000Z"
}
```

## Internal Server Error

Unexpected errors return `500 Internal Server Error`.

The API does not expose internal error messages or stack traces to clients.

Example response:

```json
{
  "type": "https://node-by-node.local/errors/http-500",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred",
  "instance": "/users",
  "timestamp": "2026-07-08T12:00:00.000Z"
}
```

## Security Notes

- Internal exception details are hidden from clients for `500` responses.
- Sensitive database fields are not included in normal response selections.
- Error responses include enough detail for API consumers to fix bad requests
  without exposing stack traces or database internals.
