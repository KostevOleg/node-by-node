import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { EmbeddingService } from './embedding.service';

const embeddingsCreate = jest.fn();

jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    embeddings: {
      create: embeddingsCreate,
    },
  })),
);

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  const configService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'OPENAI_API_KEY') {
        return 'test-api-key';
      }

      if (key === 'OPENAI_EMBEDDING_MODEL') {
        return 'text-embedding-test';
      }

      throw new Error(`Unexpected config key ${key}`);
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmbeddingService(configService as unknown as ConfigService);
  });

  it('creates embeddings in batches and preserves vector order', async () => {
    const texts = Array.from({ length: 201 }, (_, index) => `chunk ${index}`);

    embeddingsCreate
      .mockResolvedValueOnce({
        data: Array.from({ length: 200 }, (_, index) => ({
          embedding: [index],
        })),
      })
      .mockResolvedValueOnce({
        data: [
          {
            embedding: [200],
          },
        ],
      });

    await expect(service.embedTexts(texts)).resolves.toEqual(
      Array.from({ length: 201 }, (_, index) => [index]),
    );

    expect(embeddingsCreate).toHaveBeenCalledTimes(2);
    expect(embeddingsCreate).toHaveBeenNthCalledWith(1, {
      model: 'text-embedding-test',
      input: texts.slice(0, 200),
    });
    expect(embeddingsCreate).toHaveBeenNthCalledWith(2, {
      model: 'text-embedding-test',
      input: texts.slice(200),
    });
  });

  it('rejects empty input', async () => {
    await expect(service.embedTexts([])).rejects.toThrow(BadRequestException);
    expect(embeddingsCreate).not.toHaveBeenCalled();
  });

  it('rejects empty texts after trimming', async () => {
    await expect(service.embedTexts(['valid', '   '])).rejects.toThrow(
      BadRequestException,
    );
    expect(embeddingsCreate).not.toHaveBeenCalled();
  });

  it('creates the OpenAI client with the configured API key', () => {
    expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
  });
});
