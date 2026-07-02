# Query Analysis

## Dataset Summary

- Organizations: 10
- Users: 1,000
- Sessions: 900
- Conversations: 5,000
- Messages: 50,000

## Baseline Queries

### 1. Find User by Email

```sql
EXPLAIN ANALYZE
SELECT *
FROM "User"
WHERE "email" = 'user-1@example.com'
  AND "deletedAt" IS NULL;
```

#### Execution Plan

```text
Index Scan using "User_email_key" on "User"  (cost=0.28..8.29 rows=1 width=114) (actual time=0.067..0.068 rows=1 loops=1)
   Index Cond: ((email)::text = 'user-1@example.com'::text)
   Filter: ("deletedAt" IS NULL)
 Planning Time: 0.118 ms
 Execution Time: 0.126 ms
```

#### Observations

- PostgreSQL used the unique `email` index (`User_email_key`).
- This is good because the database did not scan the whole `User` table.
- `deletedAt IS NULL` was checked after the email lookup.
- There was no sort in this query.
- Execution time: 0.126 ms.

### 2. List Organization Users

```sql
EXPLAIN ANALYZE
SELECT *
FROM "User"
WHERE "organizationId" = '<organization-id>'
  AND "deletedAt" IS NULL
ORDER BY "createdAt" DESC
LIMIT 50;
```

#### Execution Plan

```text
   ->  Index Scan Backward using "User_createdAt_idx" on "User"  (cost=0.15..47.65 rows=100 width=114) (actual time=0.112..0.403 rows=50 loops=1)
         Filter: (("deletedAt" IS NULL) AND ("organizationId" = 'cedee361-ac82-4498-98d0-4c6476a9a2a9'::uuid))
         Rows Removed by Filter: 451
 Planning Time: 0.282 ms
 Execution Time: 0.544 ms
```

#### Observations

- PostgreSQL used the `createdAt` index in reverse order for `ORDER BY createdAt DESC`.
- This avoided a separate sort step.
- The `organizationId` and `deletedAt` filters were applied after reading rows from the index.
- PostgreSQL removed 451 rows by filter before returning 50 rows.
- This query can probably be improved with a composite index.
- Execution time: 0.544 ms.

### 3. List User Conversations

```sql
EXPLAIN ANALYZE
SELECT *
FROM "Conversation"
WHERE "userId" = '<user-id>'
  AND "deletedAt" IS NULL
ORDER BY "createdAt" DESC
LIMIT 50;
```

#### Execution Plan

```text
 Sort  (cost=20.62..20.63 rows=5 width=103) (actual time=0.056..0.057 rows=5 loops=1)
         Sort Key: "createdAt" DESC
         Sort Method: quicksort  Memory: 25kB
         ->  Bitmap Heap Scan on "Conversation"  (cost=4.32..20.56 rows=5 width=103) (actual time=0.025..0.026 rows=5 loops=1)
               Recheck Cond: ("userId" = 'e3357812-d880-4c40-8c71-9afd2cd1ea73'::uuid)
               Filter: ("deletedAt" IS NULL)
               Heap Blocks: exact=1
               ->  Bitmap Index Scan on "Conversation_userId_idx"  (cost=0.00..4.32 rows=5 width=0) (actual time=0.017..0.017 rows=5 loops=1)
                     Index Cond: ("userId" = 'e3357812-d880-4c40-8c71-9afd2cd1ea73'::uuid)
 Planning Time: 0.165 ms
 Execution Time: 0.191 ms
```

#### Observations

- PostgreSQL used the `Conversation_userId_idx` index to find conversations by user.
- After finding the rows, PostgreSQL still had to sort them by `createdAt DESC`.
- The sort was small because this test user has only 5 conversations.
- `deletedAt IS NULL` was applied as a filter.
- This query can be improved with an index that includes both `userId` and `createdAt`.
- Execution time: 0.191 ms.

### 4. List Conversation Messages

```sql
EXPLAIN ANALYZE
SELECT *
FROM "Message"
WHERE "conversationId" = '<conversation-id>'
  AND "deletedAt" IS NULL
ORDER BY "createdAt" ASC
LIMIT 50;
```

#### Execution Plan

```text
Sort  (cost=41.57..41.59 rows=10 width=121) (actual time=0.054..0.055 rows=10 loops=1)
         Sort Key: "createdAt"
         Sort Method: quicksort  Memory: 27kB
         ->  Bitmap Heap Scan on "Message"  (cost=4.37..41.40 rows=10 width=121) (actual time=0.027..0.029 rows=10 loops=1)
               Recheck Cond: ("conversationId" = 'c5e012d6-09cf-4c6e-b60d-150601aac774'::uuid)
               Filter: ("deletedAt" IS NULL)
               Heap Blocks: exact=1
               ->  Bitmap Index Scan on "Message_conversationId_idx"  (cost=0.00..4.37 rows=10 width=0) (actual time=0.018..0.018 rows=10 loops=1)
                     Index Cond: ("conversationId" = 'c5e012d6-09cf-4c6e-b60d-150601aac774'::uuid)
 Planning Time: 0.123 ms
 Execution Time: 0.176 ms
```

#### Observations

- PostgreSQL used the `Message_conversationId_idx` index to find messages by conversation.
- After finding the rows, PostgreSQL still had to sort them by `createdAt`.
- The sort was small because this conversation has only 10 messages.
- `deletedAt IS NULL` was applied as a filter.
- This query can be improved with an index that includes both `conversationId` and `createdAt`.
- Execution time: 0.176 ms.

### 5. List Active Sessions

```sql
EXPLAIN ANALYZE
SELECT *
FROM "Session"
WHERE "status" = 'ACTIVE'
  AND "revokedAt" IS NULL
ORDER BY "createdAt" DESC
LIMIT 50;
```

#### Execution Plan

```text
->  Index Scan Backward using "Session_createdAt_idx" on "Session"  (cost=0.15..46.90 rows=900 width=146) (actual time=0.146..0.163 rows=50 loops=1)
         Filter: (("revokedAt" IS NULL) AND (status = 'ACTIVE'::"SessionStatus"))
 Planning Time: 0.151 ms
 Execution Time: 0.234 ms
```

#### Observations

- PostgreSQL used the `createdAt` index in reverse order for `ORDER BY createdAt DESC`.
- This avoided a separate sort step.
- The `status` and `revokedAt` filters were applied after reading rows from the index.
- This is fine for the current data, but it may get worse if there are many expired or revoked sessions.
- This query can probably be improved with a composite index for active sessions.
- Execution time: 0.234 ms.

## Initial Observations

- The email lookup is already fast because it uses a unique index.
- Some list queries use an index, but still need extra filtering or sorting.
- `List Organization Users` is the clearest place for improvement because PostgreSQL removed 451 rows by filter.
- `List User Conversations` and `List Conversation Messages` could be improved by indexes that also support ordering by `createdAt`.
- Good index candidates for the next task are:
  - `User(organizationId, deletedAt, createdAt)`
  - `Conversation(userId, deletedAt, createdAt)`
  - `Message(conversationId, deletedAt, createdAt)`
  - `Session(status, revokedAt, createdAt)`

## Added Indexes

- `User(organizationId, deletedAt, createdAt)`
- `Conversation(userId, deletedAt, createdAt)`
- `Message(conversationId, deletedAt, createdAt)`
- `Session(status, revokedAt, createdAt)`

## Optimized Queries

### 1. Find User by Email

```text
Index Scan using "User_email_key" on "User"  (cost=0.28..8.29 rows=1 width=114) (actual time=0.055..0.056 rows=1 loops=1)
   Index Cond: ((email)::text = 'user-1@example.com'::text)
   Filter: ("deletedAt" IS NULL)
 Planning Time: 0.145 ms
 Execution Time: 0.114 ms
```

### 2. List Organization Users

```text
 Limit  (cost=0.15..23.90 rows=50 width=114) (actual time=0.048..0.210 rows=50 loops=1)
   ->  Index Scan Backward using "User_createdAt_idx" on "User"  (cost=0.15..47.65 rows=100 width=114) (actual time=0.047..0.191 rows=50 loops=1)
         Filter: (("deletedAt" IS NULL) AND ("organizationId" = 'cedee361-ac82-4498-98d0-4c6476a9a2a9'::uuid))
         Rows Removed by Filter: 451
 Planning Time: 0.150 ms
 Execution Time: 0.264 ms
```

### 3. List User Conversations

```text
Limit  (cost=20.62..20.63 rows=5 width=103) (actual time=0.060..0.063 rows=5 loops=1)
   ->  Sort  (cost=20.62..20.63 rows=5 width=103) (actual time=0.058..0.060 rows=5 loops=1)
         Sort Key: "createdAt" DESC
         Sort Method: quicksort  Memory: 25kB
         ->  Bitmap Heap Scan on "Conversation"  (cost=4.32..20.56 rows=5 width=103) (actual time=0.032..0.035 rows=5 loops=1)
               Recheck Cond: ("userId" = 'e3357812-d880-4c40-8c71-9afd2cd1ea73'::uuid)
               Filter: ("deletedAt" IS NULL)
               Heap Blocks: exact=1
               ->  Bitmap Index Scan on "Conversation_userId_idx"  (cost=0.00..4.32 rows=5 width=0) (actual time=0.018..0.018 rows=5 loops=1)
                     Index Cond: ("userId" = 'e3357812-d880-4c40-8c71-9afd2cd1ea73'::uuid)
 Planning Time: 0.303 ms
 Execution Time: 0.173 ms
```

### 4. List Conversation Messages

```text
Limit  (cost=41.57..41.59 rows=10 width=121) (actual time=0.081..0.084 rows=10 loops=1)
   ->  Sort  (cost=41.57..41.59 rows=10 width=121) (actual time=0.054..0.055 rows=10 loops=1)
         Sort Key: "createdAt"
         Sort Method: quicksort  Memory: 27kB
         ->  Bitmap Heap Scan on "Message"  (cost=4.37..41.40 rows=10 width=121) (actual time=0.029..0.033 rows=10 loops=1)
               Recheck Cond: ("conversationId" = 'c5e012d6-09cf-4c6e-b60d-150601aac774'::uuid)
               Filter: ("deletedAt" IS NULL)
               Heap Blocks: exact=1
               ->  Bitmap Index Scan on "Message_conversationId_idx"  (cost=0.00..4.37 rows=10 width=0) (actual time=0.017..0.017 rows=10 loops=1)
                     Index Cond: ("conversationId" = 'c5e012d6-09cf-4c6e-b60d-150601aac774'::uuid)
 Planning Time: 0.150 ms
 Execution Time: 0.185 ms
```

### 5. List Active Sessions

```text
 Limit  (cost=0.15..2.75 rows=50 width=146) (actual time=0.083..0.110 rows=50 loops=1)
   ->  Index Scan Backward using "Session_createdAt_idx" on "Session"  (cost=0.15..46.90 rows=900 width=146) (actual time=0.082..0.103 rows=50 loops=1)
         Filter: (("revokedAt" IS NULL) AND (status = 'ACTIVE'::"SessionStatus"))
 Planning Time: 0.157 ms
 Execution Time: 0.170 ms
```

## Before / After Summary

| Query                      | Before  | After   | Measured Result |
| -------------------------- | ------- | ------- | --------------- |
| Find User by Email         | 0.126ms | 0.114ms | Slightly faster |
| List Organization Users    | 0.544ms | 0.264ms | >50% faster     |
| List User Conversations    | 0.191ms | 0.173ms | Slightly faster |
| List Conversation Messages | 0.176ms | 0.185ms | About the same  |
| List Active Sessions       | 0.234ms | 0.170ms | Faster          |

## Optimization Observations

- The measured time for `List Organization Users` changed from 0.544ms to 0.264ms, which is more than 50% faster in this run.
- The query plans show that PostgreSQL mostly continued using the existing indexes, for example `User_createdAt_idx`, `Conversation_userId_idx`, `Message_conversationId_idx`, and `Session_createdAt_idx`.
- Because the dataset is small and the queries were executed multiple times, the measured improvements can be affected by cache warm-up and normal timing noise.
- `List Conversation Messages` stayed about the same. The query still used `Message_conversationId_idx`, and sorting only 10 messages is already cheap.
- The new composite indexes are still useful for the intended query patterns, but they are expected to help more when each user or conversation has more related rows.

## Cursor-Based Pagination

Cursor-based pagination was added for the main large list queries in the
application. The implementation is placed in service methods because the task
requires pagination service methods.

`LIMIT/OFFSET` pagination works by skipping a number of rows before returning
the requested page. This becomes slower as the offset grows because PostgreSQL
still has to walk through the skipped rows. Cursor pagination uses the last item
from the previous page as the starting point for the next page. The client sends
that id as `cursor`, and Prisma starts the next query after that row.

Each method uses:

- `cursor: { id: cursor }` when a cursor is provided
- `skip: 1` to avoid returning the cursor record again
- `take + 1` to check whether another page exists

### Methods

| Service                | Method                                                      | Main filter                         | Order            |
| ---------------------- | ----------------------------------------------------------- | ----------------------------------- | ---------------- |
| `UsersService`         | `getUsersPage(cursor, take)`                                | `deletedAt: null`                   | `createdAt DESC` |
| `UsersService`         | `getOrganizationUsersPage(organizationId, cursor, take)`    | `organizationId`, `deletedAt: null` | `createdAt DESC` |
| `ConversationsService` | `getConversationsPage(cursor, take)`                        | `deletedAt: null`                   | `createdAt DESC` |
| `ConversationsService` | `getUserConversationsPage(userId, cursor, take)`            | `userId`, `deletedAt: null`         | `createdAt DESC` |
| `MessagesService`      | `getMessagesPage(cursor, take)`                             | `deletedAt: null`                   | `createdAt DESC` |
| `MessagesService`      | `getConversationMessagesPage(conversationId, cursor, take)` | `conversationId`, `deletedAt: null` | `createdAt ASC`  |

Each pagination method returns the same shape:

```ts
{
  data: items,
  nextCursor: lastItemIdOrNull,
}
```

When `nextCursor` is `null`, there are no more pages.

### Example Usage

First page:

```ts
await usersService.getUsersPage(undefined, 50);
```

Next page:

```ts
await usersService.getUsersPage(lastUserId, 50);
```

Scoped pagination uses the same pattern with a parent id:

```ts
await usersService.getOrganizationUsersPage(organizationId, undefined, 50);
await conversationsService.getUserConversationsPage(userId, undefined, 50);
await messagesService.getConversationMessagesPage(
  conversationId,
  undefined,
  50,
);
```

### Validation

The page size is clamped between 1 and 100 records inside the service methods,
so a client cannot request an unexpectedly large page.

Project tests and TypeScript build pass after adding these pagination methods:

```bash
yarn.cmd test
yarn.cmd build
```

## Transactions

Two transactional service methods were added with Prisma `$transaction()`.

### Create Conversation With First Message

`ConversationsService.createWithFirstMessage()` creates a conversation and its
first message in one transaction.

This needs a transaction because the application should not create an empty
conversation if creating the first message fails. Prisma commits the transaction
only after both `tx.conversation.create()` and `tx.message.create()` succeed. If
the message creation throws, Prisma rolls back the created conversation.

### Delete Organization With Users And Sessions

`OrganizationsService.deleteWithUsersAndSessions()` archives an organization,
soft-deletes its users, and revokes related sessions in one transaction.

This needs a transaction because organization deletion should not leave users or
sessions in a partially updated state. If updating users or sessions fails, the
organization update is rolled back together with the rest of the transaction.

### Rollback Demonstration

Rollback behavior is covered in unit tests by forcing an error inside the
transaction callback. The tests verify that the service rejects and that later
transaction steps are not completed after the failure.
