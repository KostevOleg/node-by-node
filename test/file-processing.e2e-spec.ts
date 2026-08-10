import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { fileTypeFromBuffer } from 'file-type';
import request from 'supertest';
import { App } from 'supertest/types';
import { Request } from 'express';
import { AccessTokenGuard } from '../src/auth/access-token.guard';
import { AppModule } from '../src/app.module';
import { ObjectStorageService } from '../src/files/storage/object-storage.service';
import { PrismaService } from '../src/prisma/prisma-service';
import { RabbitMqPublisher } from '../src/queue/rabbitmq.publisher';
import { VirusScanService } from '../src/files/virus-scan.service';

const mockPrismaFn = () => jest.fn<(...args: unknown[]) => Promise<unknown>>();

type PrismaServiceMock = {
  $transaction: (
    callback: (tx: PrismaServiceMock) => Promise<unknown>,
  ) => Promise<unknown>;
  organizationFile: {
    findFirst: ReturnType<typeof mockPrismaFn>;
    create: ReturnType<typeof mockPrismaFn>;
  };
  fileProcessingJob: {
    create: ReturnType<typeof mockPrismaFn>;
  };
};

const user = {
  id: '9b82f5a4-78f3-4f23-b78f-10654cf9a2f1',
  organizationId: 'b35d9d42-75b0-4d72-aea8-897293e7a15f',
  email: 'user@example.com',
};

const authGuard: CanActivate = {
  canActivate(context: ExecutionContext): boolean {
    const httpRequest = context
      .switchToHttp()
      .getRequest<Request & { user?: typeof user }>();
    httpRequest.user = user;
    return true;
  },
};

describe('File processing upload (e2e)', () => {
  let app: INestApplication<App>;
  const prismaService: PrismaServiceMock = {
    $transaction: jest.fn((callback) => callback(prismaService)),
    organizationFile: {
      findFirst: mockPrismaFn(),
      create: mockPrismaFn(),
    },
    fileProcessingJob: {
      create: mockPrismaFn(),
    },
  };
  const objectStorageService = {
    putObject: mockPrismaFn(),
    deleteObject: mockPrismaFn(),
  };
  const virusScanService = {
    assertClean: mockPrismaFn(),
  };
  const rabbitMqPublisher = {
    publishFileProcessingJob: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(authGuard)
      .overrideProvider(PrismaService)
      .useValue(prismaService)
      .overrideProvider(ObjectStorageService)
      .useValue(objectStorageService)
      .overrideProvider(VirusScanService)
      .useValue(virusScanService)
      .overrideProvider(RabbitMqPublisher)
      .useValue(rabbitMqPublisher)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(fileTypeFromBuffer).mockResolvedValue({
      ext: 'xlsx',
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    prismaService.organizationFile.findFirst.mockResolvedValue(null);
    virusScanService.assertClean.mockResolvedValue(undefined);
    objectStorageService.putObject.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('uploads an .xlsx file, creates a processing job, and publishes it', async () => {
    const fileRecord = {
      id: 'd53072db-7166-4369-a454-bb8d35d6d15d',
      organizationId: user.organizationId,
      uploadedById: user.id,
      originalName: 'sales.xlsx',
      storageKey: `organizations/${user.organizationId}/files/d53072db-7166-4369-a454-bb8d35d6d15d.xlsx`,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: '.xlsx',
      size: 9,
      sha256: 'hash',
      createdAt: new Date('2026-08-06T00:00:00.000Z'),
      updatedAt: new Date('2026-08-06T00:00:00.000Z'),
      deletedAt: null,
    };
    const job = {
      id: '6fc74af9-c7e6-401f-b804-a9f707162b75',
      correlationId: '7533456f-7067-4ee1-9d39-93cfaa18e7c1',
    };

    prismaService.organizationFile.create.mockResolvedValue(fileRecord);
    prismaService.fileProcessingJob.create.mockResolvedValue(job);

    await request(app.getHttpServer())
      .post('/files?processSales=true')
      .set('Authorization', 'Bearer test-token')
      .attach('file', Buffer.from('xlsx-bytes'), {
        filename: 'sales.xlsx',
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: fileRecord.id,
          originalName: 'sales.xlsx',
          mimeType: fileRecord.mimeType,
          extension: '.xlsx',
          size: 9,
        });
      });

    expect(objectStorageService.putObject).toHaveBeenCalledWith(
      expect.stringContaining(`organizations/${user.organizationId}/files/`),
      Buffer.from('xlsx-bytes'),
      fileRecord.mimeType,
    );
    expect(prismaService.fileProcessingJob.create).toHaveBeenCalledWith({
      data: {
        fileId: fileRecord.id,
        organizationId: user.organizationId,
        correlationId: expect.any(String) as string,
      },
    });
    expect(rabbitMqPublisher.publishFileProcessingJob).toHaveBeenCalledWith({
      jobId: job.id,
      fileId: fileRecord.id,
      organizationId: user.organizationId,
      storageKey: fileRecord.storageKey,
      correlationId: job.correlationId,
    });
  });
});
