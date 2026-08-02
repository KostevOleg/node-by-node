export type FileProcessingJobMessage = {
  jobId: string;
  fileId: string;
  organizationId: string;
  storageKey: string;
  correlationId: string;
};
