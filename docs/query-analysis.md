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

- PostgreSQL used the unique index on the `email` column (`User_email_key`).
- The query was executed using an `Index Scan`.
- A filter (`deletedAt IS NULL`) was applied after the index lookup.
- No sorting operation was required.
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

- PostgreSQL used a backward index scan on the `createdAt` index to satisfy the `ORDER BY createdAt DESC` clause.
- The `organizationId` and `deletedAt` conditions were applied as filters after reading rows from the index.
- 451 rows were removed by the filter before returning the requested 50 rows.
- No explicit sort operation was required because the index already provided the required order.
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

- PostgreSQL used the `Conversation_userId_idx` index to locate conversations for the specified user.
- A `Bitmap Heap Scan` was used to retrieve the matching rows from the table.
- The query performed an in-memory `Sort` (`quicksort`) on `createdAt DESC` because the index does not provide the required ordering.
- The `deletedAt IS NULL` condition was applied as a filter.
- No rows were removed by the filter.
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

- PostgreSQL used the `Message_conversationId_idx` index to find messages for the specified conversation.
- A `Bitmap Heap Scan` was used to retrieve the matching rows from the table.
- The query performed an in-memory `Sort` (`quicksort`) on `createdAt` because the index does not provide the required ordering.
- The `deletedAt IS NULL` condition was applied as a filter.
- No rows were removed by the filter.
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

- PostgreSQL used a backward index scan on the `Session_createdAt_idx` index to satisfy the `ORDER BY createdAt DESC` clause.
- The `status` and `revokedAt` conditions were applied as filters after reading rows from the index.
- No explicit sort operation was required because the index already returned rows in the correct order.
- No rows were removed by the filter.
- Execution time: 0.234 ms.

## Initial Observations

- Point lookups by unique fields are already efficient. `Find User by Email` uses the unique `User_email_key` index and has no obvious bottleneck.
- Queries that filter by a foreign key and order by `createdAt` are partially optimized, but not perfectly. `List User Conversations` and `List Conversation Messages` use foreign-key indexes, then perform an additional in-memory sort.
- `List Organization Users` and `List Active Sessions` avoid explicit sorting by scanning `createdAt` indexes backward, but filtering happens after rows are read from the index. This is visible in `Rows Removed by Filter` for organization users.
- Good candidates for follow-up optimization are composite indexes that combine the filtering columns with `createdAt`, for example indexes shaped around `organizationId + deletedAt + createdAt`, `userId + deletedAt + createdAt`, `conversationId + deletedAt + createdAt`, and `status + revokedAt + createdAt`.
