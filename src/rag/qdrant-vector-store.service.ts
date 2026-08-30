import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { createHash } from 'node:crypto';

type UpsertChunksInput = {
  chunks: string[];
  vectors: number[][];
  organizationId: string;
  fileId: string;
  jobId: string;
  sourceName: string;
  extension: string;
};

@Injectable()
export class QdrantVectorStoreService {
  private readonly client: QdrantClient;
  readonly collection: string;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.getOrThrow<string>('QDRANT_URL');
    this.collection =
      this.configService.getOrThrow<string>('QDRANT_COLLECTION');
    this.client = new QdrantClient({ url });
  }

  async upsertChunks(input: UpsertChunksInput): Promise<void> {
    const {
      chunks,
      vectors,
      organizationId,
      fileId,
      jobId,
      sourceName,
      extension,
    } = input;

    if (chunks.length === 0) {
      throw new BadRequestException('Chunks must not be empty');
    }

    if (vectors.length === 0) {
      throw new BadRequestException('Vectors must not be empty');
    }

    if (chunks.length !== vectors.length) {
      throw new BadRequestException('Chunks and vectors length must match');
    }

    await this.ensureCollection(vectors[0].length);
    await this.deleteChunksByFileId(fileId);

    const points = chunks.map((chunk, index) => ({
      id: this.createPointId(fileId, index),
      vector: vectors[index],
      payload: {
        organizationId,
        fileId,
        jobId,
        chunkIndex: index,
        text: chunk,
        sourceName,
        extension,
      },
    }));

    await this.client.upsert(this.collection, {
      points,
    });
  }

  private async ensureCollection(vectorSize: number): Promise<void> {
    const collections = await this.client.getCollections();
    const exists = collections.collections.some(
      (collection) => collection.name === this.collection,
    );

    if (exists) {
      return;
    }

    await this.client.createCollection(this.collection, {
      vectors: {
        size: vectorSize,
        distance: 'Cosine',
      },
    });
  }

  private async deleteChunksByFileId(fileId: string): Promise<void> {
    await this.client.delete(this.collection, {
      filter: {
        must: [
          {
            key: 'fileId',
            match: {
              value: fileId,
            },
          },
        ],
      },
    });
  }

  private createPointId(fileId: string, chunkIndex: number): string {
    const hash = createHash('sha256')
      .update(`${fileId}:${chunkIndex}`)
      .digest('hex');

    return [
      hash.slice(0, 8),
      hash.slice(8, 12),
      hash.slice(12, 16),
      hash.slice(16, 20),
      hash.slice(20, 32),
    ].join('-');
  }
}
