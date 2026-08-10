-- CreateEnum
CREATE TYPE "FileProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "FileProcessingJob" (
    "id" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "status" "FileProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "correlationId" UUID NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "totalQuantity" INTEGER,
    "totalRevenue" DECIMAL(12,2),
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FileProcessingJob_fileId_key" ON "FileProcessingJob"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "FileProcessingJob_correlationId_key" ON "FileProcessingJob"("correlationId");

-- CreateIndex
CREATE INDEX "FileProcessingJob_organizationId_status_createdAt_idx" ON "FileProcessingJob"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "FileProcessingJob_status_idx" ON "FileProcessingJob"("status");

-- CreateIndex
CREATE INDEX "FileProcessingJob_correlationId_idx" ON "FileProcessingJob"("correlationId");

-- AddForeignKey
ALTER TABLE "FileProcessingJob" ADD CONSTRAINT "FileProcessingJob_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "OrganizationFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileProcessingJob" ADD CONSTRAINT "FileProcessingJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
