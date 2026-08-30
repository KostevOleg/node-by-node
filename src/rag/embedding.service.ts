import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly client: OpenAI;
  readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('OPENAI_API_KEY');
    this.model = this.configService.getOrThrow<string>(
      'OPENAI_EMBEDDING_MODEL',
    );
    this.client = new OpenAI({ apiKey });
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    const normalizedTexts = texts.map((text) => text.trim());
    if (normalizedTexts.length === 0) {
      throw new BadRequestException('Embedding input must not be empty');
    }
    if (normalizedTexts.some((text) => text.length === 0)) {
      throw new BadRequestException(
        'Embedding input must not contain empty texts',
      );
    }
    const vectors = await this.client.embeddings.create({
      model: this.model,
      input: normalizedTexts,
    });

    return vectors.data.map((item) => item.embedding);
  }
}
