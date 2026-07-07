-- CreateIndex
CREATE INDEX "Conversation_userId_deletedAt_createdAt_idx" ON "Conversation"("userId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_deletedAt_createdAt_idx" ON "Message"("conversationId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Session_status_revokedAt_createdAt_idx" ON "Session"("status", "revokedAt", "createdAt");

-- CreateIndex
CREATE INDEX "User_organizationId_deletedAt_createdAt_idx" ON "User"("organizationId", "deletedAt", "createdAt");
