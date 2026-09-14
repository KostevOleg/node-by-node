import { Module } from '@nestjs/common';
import { DocumentProcessingPublisher } from './publisher';

@Module({
  providers: [DocumentProcessingPublisher],
  exports: [DocumentProcessingPublisher],
})
export class DocumentProcessingQueueModule {}
