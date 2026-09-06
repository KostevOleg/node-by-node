CREATE INDEX "Conversation_organizationId_firstUserId_secondUserId_deletedAt_createdAt_idx"
ON "Conversation"("organizationId", "firstUserId", "secondUserId", "deletedAt", "createdAt");
