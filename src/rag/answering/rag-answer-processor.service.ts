import { Injectable, NotFoundException } from '@nestjs/common';
import { RagAnswerResponseDto } from '../dto/ask-rag-question.dto';
import { EmbeddingService } from '../core/embedding.service';
import { QdrantVectorStoreService } from '../core/qdrant-vector-store.service';
import { RagAnswerGeneratorService } from './rag-answer-generator.service';

@Injectable()
export class RagAnswerProcessorService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly qdrantVectorStoreService: QdrantVectorStoreService,
    private readonly ragAnswerGeneratorService: RagAnswerGeneratorService,
  ) {}

  async answerQuestion(
    organizationId: string,
    fileId: string,
    question: string,
  ): Promise<RagAnswerResponseDto> {
    const [questionVector] = await this.embeddingService.embedTexts([question]);
    const chunks = await this.qdrantVectorStoreService.searchSimilarChunks({
      vector: questionVector,
      organizationId,
      fileId,
    });

    if (chunks.length === 0) {
      throw new NotFoundException('No relevant document chunks found');
    }

    const answer = await this.ragAnswerGeneratorService.generateAnswer(
      question,
      chunks,
    );

    return {
      fileId,
      question,
      answer,
      citations: chunks,
    };
  }
}
