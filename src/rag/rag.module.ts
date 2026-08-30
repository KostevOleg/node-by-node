import { Module } from '@nestjs/common';
import { DocumentProcessingQueueModule } from 'src/queue/document-processing/module';
import { DocumentParserService } from './document-parser.service';
import { RagIngestionProducer } from './rag-ingestion.producer';
import { TextChunkerService } from './text-chunker.service';
import { EmbeddingService } from './embedding.service';
import { QdrantVectorStoreService } from './qdrant-vector-store.service';

@Module({
  imports: [DocumentProcessingQueueModule],
  providers: [
    RagIngestionProducer,
    DocumentParserService,
    TextChunkerService,
    EmbeddingService,
    QdrantVectorStoreService,
  ],
  exports: [
    RagIngestionProducer,
    DocumentParserService,
    TextChunkerService,
    EmbeddingService,
    QdrantVectorStoreService,
  ],
})
export class RagModule {}
