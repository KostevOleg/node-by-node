import { ConfigService } from '@nestjs/config';
import { FileProcessingStatus } from '@prisma/client';
import { ConsumeMessage } from 'amqplib';
import { Readable } from 'node:stream';
import { ObjectStorageService } from 'src/files/storage/object-storage.service';
import { PrismaService } from 'src/prisma/prisma-service';
import {
  RABBITMQ_DLQ_ROUTING_KEY,
  RABBITMQ_EXCHANGE,
} from 'src/queue/rabbitmq.constants';
import { FileProcessingConsumer } from './file-processing.consumer';
import { SalesExcelParserService } from './sales-excel-parser.service';

describe('FileProcessingConsumer', () => {
  it('moves a repeatedly failing job to the DLQ and ACKs the original message', async () => {
    const jobId = 'job-id';
    const fileId = 'file-id';
    const organizationId = 'organization-id';
    const correlationId = 'correlation-id';

    const prismaService = {
      fileProcessingJob: {
        findUnique: jest.fn().mockResolvedValue({
          id: jobId,
          fileId,
          organizationId,
          status: FileProcessingStatus.PENDING,
          file: {
            id: fileId,
            storageKey: 'organizations/organization-id/files/file.xlsx',
            extension: '.xlsx',
            deletedAt: null,
          },
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({ attempts: 3 }),
      },
    };
    const objectStorageService = {
      getObject: jest.fn().mockResolvedValue({
        body: Readable.from([Buffer.from('xlsx')]),
      }),
    };
    const salesExcelParserService = {
      parse: jest.fn().mockRejectedValue(new Error('temporary failure')),
    };
    const channel = {
      ack: jest.fn(),
      publish: jest.fn(),
    };
    const message = {
      content: Buffer.from(
        JSON.stringify({
          jobId,
          fileId,
          organizationId,
          storageKey: 'organizations/organization-id/files/file.xlsx',
          correlationId,
        }),
      ),
      properties: {
        contentType: 'application/json',
        correlationId,
      },
    } as unknown as ConsumeMessage;

    const consumer = new FileProcessingConsumer(
      {} as ConfigService,
      prismaService as unknown as PrismaService,
      objectStorageService as unknown as ObjectStorageService,
      salesExcelParserService as unknown as SalesExcelParserService,
    );
    Object.defineProperty(consumer, 'channel', { value: channel });

    await (
      consumer as unknown as {
        handleMessage(message: ConsumeMessage): Promise<void>;
      }
    ).handleMessage(message);

    expect(prismaService.fileProcessingJob.update).toHaveBeenCalledWith({
      where: { id: jobId },
      data: {
        attempts: {
          increment: 1,
        },
        errorMessage: 'temporary failure',
      },
      select: {
        attempts: true,
      },
    });
    expect(prismaService.fileProcessingJob.updateMany).toHaveBeenLastCalledWith(
      {
        where: {
          id: jobId,
          status: {
            not: FileProcessingStatus.COMPLETED,
          },
        },
        data: {
          status: FileProcessingStatus.FAILED,
          failedAt: expect.any(Date) as Date,
          errorMessage: 'temporary failure',
        },
      },
    );
    expect(channel.publish).toHaveBeenCalledWith(
      RABBITMQ_EXCHANGE,
      RABBITMQ_DLQ_ROUTING_KEY,
      message.content,
      {
        persistent: true,
        contentType: 'application/json',
        correlationId,
      },
    );
    expect(channel.ack).toHaveBeenCalledWith(message);
  });
});
