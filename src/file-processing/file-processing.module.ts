import { Module } from '@nestjs/common';
import { DocumentProcessingQueueModule } from 'src/queue/document-processing/module';
import { FileProcessingProducer } from './file-processing.producer';

@Module({
  imports: [DocumentProcessingQueueModule],
  providers: [FileProcessingProducer],
  exports: [FileProcessingProducer],
})
export class FileProcessingModule {}
