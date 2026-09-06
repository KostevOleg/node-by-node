-- CreateTable
CREATE TABLE "RagIngestionJob" (
    "id" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "status" "FileProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "correlationId" UUID NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "chunksCount" INTEGER,
    "embeddingModel" VARCHAR(100),
    "qdrantCollection" VARCHAR(100),
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RagIngestionJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RagIngestionJob_fileId_key" ON "RagIngestionJob"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "RagIngestionJob_correlationId_key" ON "RagIngestionJob"("correlationId");

-- CreateIndex
CREATE INDEX "RagIngestionJob_organizationId_status_createdAt_idx" ON "RagIngestionJob"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "RagIngestionJob_status_idx" ON "RagIngestionJob"("status");

-- CreateIndex
CREATE INDEX "RagIngestionJob_correlationId_idx" ON "RagIngestionJob"("correlationId");

-- AddForeignKey
ALTER TABLE "RagIngestionJob" ADD CONSTRAINT "RagIngestionJob_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "OrganizationFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagIngestionJob" ADD CONSTRAINT "RagIngestionJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
