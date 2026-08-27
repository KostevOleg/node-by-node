import { Module } from '@nestjs/common';
import { DocumentProcessingQueueModule } from 'src/queue/document-processing/module';
import { RagIngestionProducer } from './rag-ingestion.producer';

@Module({
  imports: [DocumentProcessingQueueModule],
  providers: [RagIngestionProducer],
  exports: [RagIngestionProducer],
})
export class RagModule {}
