import { ConfigService } from '@nestjs/config';
import { FileProcessingStatus } from '@prisma/client';
import { ConsumeMessage } from 'amqplib';
import { Readable } from 'node:stream';
import { ObjectStorageService } from 'src/files/storage/object-storage.service';
import { FileProcessingJobMessage } from 'src/file-processing/messages/file-processing-job.message';
import { PrismaService } from 'src/prisma/prisma-service';
import {
  RABBITMQ_DLQ_ROUTING_KEY,
  RABBITMQ_EXCHANGE,
} from 'src/queue/sales/rabbitmq.constants';
import { FileProcessingConsumer } from './file-processing.consumer';
import { SalesExcelParserService } from './sales-excel-parser.service';

describe('FileProcessingConsumer', () => {
  const jobMessage: FileProcessingJobMessage = {
    jobId: 'job-id',
    fileId: 'file-id',
    organizationId: 'organization-id',
    storageKey: 'organizations/organization-id/files/file.xlsx',
    correlationId: 'correlation-id',
  };

  const createMessage = (): ConsumeMessage =>
    ({
      content: Buffer.from(JSON.stringify(jobMessage)),
      properties: {
        contentType: 'application/json',
        correlationId: jobMessage.correlationId,
      },
    }) as ConsumeMessage;

  const createConsumerContext = (
    options: {
      status?: FileProcessingStatus;
      attemptsAfterFailure?: number;
      fileId?: string;
      parserError?: Error;
    } = {},
  ) => {
    const prismaService = {
      fileProcessingJob: {
        findUnique: jest.fn().mockResolvedValue({
          id: jobMessage.jobId,
          fileId: options.fileId ?? jobMessage.fileId,
          organizationId: jobMessage.organizationId,
          status: options.status ?? FileProcessingStatus.PENDING,
          file: {
            id: jobMessage.fileId,
            storageKey: jobMessage.storageKey,
            extension: '.xlsx',
            deletedAt: null,
          },
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({
          attempts: options.attemptsAfterFailure ?? 1,
        }),
      },
    };
    const objectStorageService = {
      getObject: jest.fn().mockResolvedValue({
        body: Readable.from([Buffer.from('xlsx')]),
      }),
    };
    const salesExcelParserService = {
      parse: options.parserError
        ? jest.fn().mockRejectedValue(options.parserError)
        : jest.fn().mockResolvedValue({
            totalQuantity: 10,
            totalRevenue: 25,
          }),
    };
    const channel = {
      ack: jest.fn(),
      nack: jest.fn(),
      publish: jest.fn(),
    };

    const consumer = new FileProcessingConsumer(
      {} as ConfigService,
      prismaService as unknown as PrismaService,
      objectStorageService as unknown as ObjectStorageService,
      salesExcelParserService as unknown as SalesExcelParserService,
    );
    Object.defineProperty(consumer, 'channel', { value: channel });

    return {
      channel,
      consumer,
      objectStorageService,
      prismaService,
      salesExcelParserService,
    };
  };

  const handleMessage = async (
    consumer: FileProcessingConsumer,
    message: ConsumeMessage,
  ) => {
    await (
      consumer as unknown as {
        handleMessage(message: ConsumeMessage): Promise<void>;
      }
    ).handleMessage(message);
  };

  it('retries a temporary failure when attempts remain', async () => {
    const message = createMessage();
    const { channel, consumer, prismaService } = createConsumerContext({
      attemptsAfterFailure: 1,
      parserError: new Error('temporary failure'),
    });

    await handleMessage(consumer, message);

    expect(prismaService.fileProcessingJob.update).toHaveBeenCalledWith({
      where: { id: jobMessage.jobId },
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
          id: jobMessage.jobId,
          status: FileProcessingStatus.PROCESSING,
        },
        data: {
          status: FileProcessingStatus.PENDING,
          errorMessage: 'temporary failure',
        },
      },
    );
    expect(channel.nack).toHaveBeenCalledWith(message, false, false);
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.publish).not.toHaveBeenCalled();
  });

  it.each([FileProcessingStatus.COMPLETED, FileProcessingStatus.FAILED])(
    'skips an already %s job and ACKs the message',
    async (status) => {
      const message = createMessage();
      const { channel, consumer, objectStorageService, prismaService } =
        createConsumerContext({ status });

      await handleMessage(consumer, message);

      expect(channel.ack).toHaveBeenCalledWith(message);
      expect(channel.nack).not.toHaveBeenCalled();
      expect(channel.publish).not.toHaveBeenCalled();
      expect(objectStorageService.getObject).not.toHaveBeenCalled();
      expect(prismaService.fileProcessingJob.update).not.toHaveBeenCalled();
      expect(prismaService.fileProcessingJob.updateMany).not.toHaveBeenCalled();
    },
  );

  it('continues a redelivered processing job without incrementing attempts', async () => {
    const message = createMessage();
    const { channel, consumer, prismaService, salesExcelParserService } =
      createConsumerContext({ status: FileProcessingStatus.PROCESSING });

    await handleMessage(consumer, message);

    expect(prismaService.fileProcessingJob.update).not.toHaveBeenCalled();
    expect(salesExcelParserService.parse).toHaveBeenCalled();
    expect(prismaService.fileProcessingJob.updateMany).toHaveBeenCalledWith({
      where: {
        id: jobMessage.jobId,
        fileId: jobMessage.fileId,
        status: {
          in: [FileProcessingStatus.PENDING, FileProcessingStatus.PROCESSING],
        },
      },
      data: {
        status: FileProcessingStatus.PROCESSING,
        startedAt: expect.any(Date) as Date,
      },
    });
    expect(prismaService.fileProcessingJob.updateMany).toHaveBeenLastCalledWith(
      {
        where: {
          id: jobMessage.jobId,
          status: FileProcessingStatus.PROCESSING,
        },
        data: {
          status: FileProcessingStatus.COMPLETED,
          totalQuantity: 10,
          totalRevenue: 25,
          completedAt: expect.any(Date) as Date,
        },
      },
    );
    expect(channel.ack).toHaveBeenCalledWith(message);
    expect(channel.nack).not.toHaveBeenCalled();
    expect(channel.publish).not.toHaveBeenCalled();
  });

  it('fails permanent payload errors without retrying', async () => {
    const message = createMessage();
    const { channel, consumer, objectStorageService, prismaService } =
      createConsumerContext({ fileId: 'different-file-id' });

    await handleMessage(consumer, message);

    expect(prismaService.fileProcessingJob.update).not.toHaveBeenCalled();
    expect(prismaService.fileProcessingJob.updateMany).toHaveBeenCalledWith({
      where: {
        id: jobMessage.jobId,
        status: {
          not: FileProcessingStatus.COMPLETED,
        },
      },
      data: {
        status: FileProcessingStatus.FAILED,
        failedAt: expect.any(Date) as Date,
        errorMessage: `File processing job ${jobMessage.jobId} payload mismatch`,
      },
    });
    expect(objectStorageService.getObject).not.toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalledWith(message);
    expect(channel.nack).not.toHaveBeenCalled();
    expect(channel.publish).not.toHaveBeenCalled();
  });

  it('moves a repeatedly failing job to the DLQ and ACKs the original message', async () => {
    const message = createMessage();
    const { channel, consumer, prismaService } = createConsumerContext({
      attemptsAfterFailure: 3,
      parserError: new Error('temporary failure'),
    });

    await handleMessage(consumer, message);

    expect(prismaService.fileProcessingJob.update).toHaveBeenCalledWith({
      where: { id: jobMessage.jobId },
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
          id: jobMessage.jobId,
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
        correlationId: jobMessage.correlationId,
      },
    );
    expect(channel.ack).toHaveBeenCalledWith(message);
    expect(channel.nack).not.toHaveBeenCalled();
  });
});
