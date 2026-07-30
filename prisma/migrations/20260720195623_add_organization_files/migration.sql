-- CreateTable
CREATE TABLE "OrganizationFile" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "storageKey" VARCHAR(500) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "extension" VARCHAR(20) NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OrganizationFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationFile_storageKey_key" ON "OrganizationFile"("storageKey");

-- CreateIndex
CREATE INDEX "OrganizationFile_sha256_idx" ON "OrganizationFile"("sha256");

-- CreateIndex
CREATE INDEX "OrganizationFile_organizationId_deletedAt_createdAt_idx" ON "OrganizationFile"("organizationId", "deletedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "OrganizationFile" ADD CONSTRAINT "OrganizationFile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationFile" ADD CONSTRAINT "OrganizationFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
