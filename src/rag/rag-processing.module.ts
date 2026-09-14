import { Module } from '@nestjs/common';
import { RagAnswerGeneratorService } from './answering/rag-answer-generator.service';
import { RagAnswerProcessorService } from './answering/rag-answer-processor.service';
import { DocumentParserService } from './core/document-parser.service';
import { EmbeddingService } from './core/embedding.service';
import { QdrantVectorStoreService } from './core/qdrant-vector-store.service';
import { TextChunkerService } from './core/text-chunker.service';

@Module({
  providers: [
    RagAnswerGeneratorService,
    RagAnswerProcessorService,
    DocumentParserService,
    TextChunkerService,
    EmbeddingService,
    QdrantVectorStoreService,
  ],
  exports: [
    RagAnswerGeneratorService,
    RagAnswerProcessorService,
    DocumentParserService,
    TextChunkerService,
    EmbeddingService,
    QdrantVectorStoreService,
  ],
})
export class RagProcessingModule {}
