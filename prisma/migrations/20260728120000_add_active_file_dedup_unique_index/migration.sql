-- CreateIndex
CREATE UNIQUE INDEX "OrganizationFile_organizationId_sha256_active_key"
ON "OrganizationFile"("organizationId", "sha256")
WHERE "deletedAt" IS NULL;
