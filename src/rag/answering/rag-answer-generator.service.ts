import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { RagSearchResult } from '../core/qdrant-vector-store.service';

@Injectable()
export class RagAnswerGeneratorService {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('OPENAI_API_KEY');
    this.model = this.configService.getOrThrow<string>('OPENAI_CHAT_MODEL');
    this.client = new OpenAI({ apiKey });
  }

  async generateAnswer(
    question: string,
    chunks: RagSearchResult[],
  ): Promise<string> {
    const response = await this.client.responses.create({
      model: this.model,
      input: [
        {
          role: 'system',
          content:
            'Answer using only the provided document context. If the context is not enough, say that the document does not contain enough information. Include citation markers like [1] when using context.',
        },
        {
          role: 'user',
          content: this.buildUserPrompt(question, chunks),
        },
      ],
    });

    return response.output_text.trim();
  }

  private buildUserPrompt(question: string, chunks: RagSearchResult[]): string {
    const context = chunks
      .map((chunk, index) => `[${index + 1}] ${chunk.text}`)
      .join('\n\n');

    return `Context:\n${context}\n\nQuestion:\n${question}`;
  }
}
