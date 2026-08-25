-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "title",
ADD COLUMN     "firstUserId" UUID,
ADD COLUMN     "secondUserId" UUID;

-- Backfill direct-chat participants only when two real participants are known.
UPDATE "Conversation" c
SET
    "firstUserId" = p."firstUserId",
    "secondUserId" = p."secondUserId"
FROM (
    SELECT
        "conversationId",
        MIN("userId") AS "firstUserId",
        MAX("userId") AS "secondUserId"
    FROM "ConversationParticipant"
    GROUP BY "conversationId"
    HAVING COUNT(DISTINCT "userId") = 2
) p
WHERE c."id" = p."conversationId";

-- Legacy rows without two participants cannot be represented as direct chats.
-- Remove their dependent rows before enforcing the new NOT NULL columns.
DELETE FROM "Message"
WHERE "conversationId" IN (
    SELECT "id"
    FROM "Conversation"
    WHERE "firstUserId" IS NULL
       OR "secondUserId" IS NULL
);

DELETE FROM "ConversationParticipant"
WHERE "conversationId" IN (
    SELECT "id"
    FROM "Conversation"
    WHERE "firstUserId" IS NULL
       OR "secondUserId" IS NULL
);

DELETE FROM "Conversation"
WHERE "firstUserId" IS NULL
   OR "secondUserId" IS NULL;

ALTER TABLE "Conversation" ALTER COLUMN "firstUserId" SET NOT NULL;
ALTER TABLE "Conversation" ALTER COLUMN "secondUserId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "senderId" UUID;

-- Keep only one active direct chat per pair before adding the partial unique index.
WITH duplicate_active_pairs AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "organizationId", "firstUserId", "secondUserId"
            ORDER BY "createdAt" ASC, "id" ASC
        ) AS row_number
    FROM "Conversation"
    WHERE "deletedAt" IS NULL
)
UPDATE "Conversation" c
SET "deletedAt" = CURRENT_TIMESTAMP
FROM duplicate_active_pairs d
WHERE c."id" = d."id"
  AND d.row_number > 1;

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_organizationId_firstUserId_secondUserId_active_key"
ON "Conversation"("organizationId", "firstUserId", "secondUserId")
WHERE "deletedAt" IS NULL;

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
