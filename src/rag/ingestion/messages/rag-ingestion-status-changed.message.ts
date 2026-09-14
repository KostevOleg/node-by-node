import { FileProcessingStatus } from '@prisma/client';

export type RagIngestionStatusChangedMessage = {
  fileId: string;
  organizationId: string;
  status: FileProcessingStatus;
  chunksCount: number | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  correlationId: string;
};
