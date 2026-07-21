import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';

export type StoredObject = {
  body: Readable;
  contentType?: string;
  contentLength?: number;
};

@Injectable()
export class ObjectStorageService implements OnModuleInit {
  private readonly bucket: string;
  private readonly client: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.getOrThrow<string>('S3_BUCKET');
    this.client = new S3Client({
      endpoint: this.configService.getOrThrow<string>('S3_ENDPOINT'),
      region: this.configService.getOrThrow<string>('S3_REGION'),
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: this.configService.getOrThrow<string>('S3_SECRET_KEY'),
      },
      forcePathStyle: this.configService.getOrThrow<boolean>(
        'S3_FORCE_PATH_STYLE',
      ),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBucketExists();
  }

  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async getObject(key: string): Promise<StoredObject> {
    const object = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    if (!(object.Body instanceof Readable)) {
      throw new Error('S3 object body is not a Node.js readable stream.');
    }

    return {
      body: object.Body,
      contentType: object.ContentType,
      contentLength: object.ContentLength,
    };
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      return true;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return false;
      }

      throw error;
    }
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      if (!this.isNotFoundError(error)) {
        throw error;
      }

      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  private isNotFoundError(error: unknown): boolean {
    return (
      error instanceof S3ServiceException &&
      (error.name === 'NotFound' ||
        error.name === 'NoSuchBucket' ||
        error.$metadata.httpStatusCode === 404)
    );
  }
}
