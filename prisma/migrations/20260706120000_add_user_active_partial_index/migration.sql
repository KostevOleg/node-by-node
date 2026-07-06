-- CreateIndex
CREATE INDEX "User_organizationId_createdAt_id_active_idx"
ON "User"("organizationId", "createdAt" DESC, "id" DESC)
WHERE "deletedAt" IS NULL;
