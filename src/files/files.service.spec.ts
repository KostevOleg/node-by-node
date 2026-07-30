import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { fileTypeFromBuffer } from 'file-type';
import { Readable } from 'node:stream';
import { AuthenticatedUser } from 'src/auth/types/authenticated-request';
import { PrismaService } from 'src/prisma/prisma-service';
import { FilesService } from './files.service';
import { ObjectStorageService } from './storage/object-storage.service';
import { VirusScanService } from './virus-scan.service';

jest.mock('file-type', () => ({
  fileTypeFromBuffer: jest.fn(),
}));

const prismaService = {
  organizationFile: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

const objectStorageService = {
  putObject: jest.fn(),
  getObject: jest.fn(),
  deleteObject: jest.fn(),
};

const virusScanService = {
  assertClean: jest.fn(),
};

describe('FilesService', () => {
  let service: FilesService;

  const user: AuthenticatedUser = {
    id: '9b82f5a4-78f3-4f23-b78f-10654cf9a2f1',
    organizationId: 'b35d9d42-75b0-4d72-aea8-897293e7a15f',
    email: 'user@example.com',
  };

  const fileRecord = {
    id: 'd53072db-7166-4369-a454-bb8d35d6d15d',
    organizationId: user.organizationId,
    uploadedById: user.id,
    originalName: 'report.pdf',
    storageKey:
      'organizations/b35d9d42-75b0-4d72-aea8-897293e7a15f/files/file.pdf',
    mimeType: 'application/pdf',
    extension: '.pdf',
    size: 12,
    sha256: 'hash',
    createdAt: new Date('2026-07-23T00:00:00.000Z'),
    updatedAt: new Date('2026-07-23T00:00:00.000Z'),
    deletedAt: null,
  };

  const makeUpload = (
    overrides: Partial<Express.Multer.File> = {},
  ): Express.Multer.File =>
    ({
      originalname: 'report.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('%PDF-test-file'),
      size: 14,
      ...overrides,
    }) as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FilesService(
      prismaService as unknown as PrismaService,
      objectStorageService as unknown as ObjectStorageService,
      virusScanService as unknown as VirusScanService,
    );
    jest.mocked(fileTypeFromBuffer).mockResolvedValue({
      ext: 'pdf',
      mime: 'application/pdf',
    });
    virusScanService.assertClean.mockResolvedValue(undefined);
  });

  it('uploads a clean organization file', async () => {
    const upload = makeUpload();

    prismaService.organizationFile.findFirst.mockResolvedValue(null);
    prismaService.organizationFile.create.mockResolvedValue(fileRecord);

    await expect(service.uploadFile(user, upload)).resolves.toMatchObject({
      id: fileRecord.id,
      originalName: fileRecord.originalName,
      mimeType: fileRecord.mimeType,
      extension: fileRecord.extension,
      size: fileRecord.size,
    });

    expect(virusScanService.assertClean).toHaveBeenCalledWith(upload.buffer);
    expect(objectStorageService.putObject).toHaveBeenCalledWith(
      expect.stringContaining(`organizations/${user.organizationId}/files/`),
      upload.buffer,
      upload.mimetype,
    );
    expect(prismaService.organizationFile.create).toHaveBeenCalled();
  });

  it('does not save a file when virus scan fails', async () => {
    const upload = makeUpload();

    prismaService.organizationFile.findFirst.mockResolvedValue(null);
    virusScanService.assertClean.mockRejectedValue(
      new BadRequestException('File failed virus scan'),
    );

    await expect(service.uploadFile(user, upload)).rejects.toThrow(
      BadRequestException,
    );

    expect(virusScanService.assertClean).toHaveBeenCalledWith(upload.buffer);
    expect(objectStorageService.putObject).not.toHaveBeenCalled();
    expect(prismaService.organizationFile.create).not.toHaveBeenCalled();
  });

  it('uploads plain text files when file-type cannot detect them', async () => {
    const upload = makeUpload({
      originalname: 'notes.txt',
      mimetype: 'text/plain',
      buffer: Buffer.from('hello from plain text'),
      size: 21,
    });
    const textFileRecord = {
      ...fileRecord,
      originalName: 'notes.txt',
      mimeType: 'text/plain',
      extension: '.txt',
      size: 21,
    };

    jest.mocked(fileTypeFromBuffer).mockResolvedValue(undefined);
    prismaService.organizationFile.findFirst.mockResolvedValue(null);
    prismaService.organizationFile.create.mockResolvedValue(textFileRecord);

    await expect(service.uploadFile(user, upload)).resolves.toMatchObject({
      originalName: 'notes.txt',
      mimeType: 'text/plain',
      extension: '.txt',
    });

    expect(virusScanService.assertClean).toHaveBeenCalledWith(upload.buffer);
    expect(objectStorageService.putObject).toHaveBeenCalled();
  });

  it('rejects missing files before hashing', async () => {
    await expect(
      service.uploadFile(user, undefined as unknown as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);

    expect(fileTypeFromBuffer).not.toHaveBeenCalled();
    expect(prismaService.organizationFile.findFirst).not.toHaveBeenCalled();
    expect(virusScanService.assertClean).not.toHaveBeenCalled();
    expect(objectStorageService.putObject).not.toHaveBeenCalled();
  });

  it('rejects duplicate files in the same organization', async () => {
    prismaService.organizationFile.findFirst.mockResolvedValue({
      id: 'existing-file-id',
    });

    await expect(service.uploadFile(user, makeUpload())).rejects.toThrow(
      ConflictException,
    );

    expect(virusScanService.assertClean).not.toHaveBeenCalled();
    expect(objectStorageService.putObject).not.toHaveBeenCalled();
  });

  it('cleans up storage and returns conflict when database dedup wins a race', async () => {
    const upload = makeUpload();

    prismaService.organizationFile.findFirst.mockResolvedValue(null);
    prismaService.organizationFile.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: 'test',
        code: 'P2002',
        meta: {
          target: ['organizationId', 'sha256'],
        },
      }),
    );

    await expect(service.uploadFile(user, upload)).rejects.toThrow(
      ConflictException,
    );

    expect(objectStorageService.putObject).toHaveBeenCalled();
    expect(objectStorageService.deleteObject).toHaveBeenCalledWith(
      expect.stringContaining(`organizations/${user.organizationId}/files/`),
    );
  });

  it('rejects dangerous double extensions', async () => {
    await expect(
      service.uploadFile(
        user,
        makeUpload({
          originalname: 'shell.php.jpg',
          mimetype: 'image/jpeg',
        }),
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prismaService.organizationFile.findFirst).not.toHaveBeenCalled();
    expect(virusScanService.assertClean).not.toHaveBeenCalled();
    expect(objectStorageService.putObject).not.toHaveBeenCalled();
  });

  it('rejects files whose detected content type does not match the extension', async () => {
    jest.mocked(fileTypeFromBuffer).mockResolvedValue({
      ext: 'jpg',
      mime: 'image/jpeg',
    });

    await expect(
      service.uploadFile(
        user,
        makeUpload({
          originalname: 'avatar.png',
          mimetype: 'image/png',
          buffer: Buffer.from('jpeg bytes'),
        }),
      ),
    ).rejects.toThrow(BadRequestException);

    expect(virusScanService.assertClean).not.toHaveBeenCalled();
    expect(objectStorageService.putObject).not.toHaveBeenCalled();
    expect(prismaService.organizationFile.create).not.toHaveBeenCalled();
  });

  it('lists only current organization files', async () => {
    prismaService.organizationFile.findMany.mockResolvedValue([fileRecord]);

    await expect(service.getFilesPage(user, undefined, 10)).resolves.toEqual({
      data: [expect.objectContaining({ id: fileRecord.id })],
      nextCursor: null,
    });

    expect(prismaService.organizationFile.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: user.organizationId,
        deletedAt: null,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 11,
    });
  });

  it('downloads only current organization files', async () => {
    prismaService.organizationFile.findFirst.mockResolvedValue(fileRecord);
    objectStorageService.getObject.mockResolvedValue({
      body: Readable.from(['file']),
      contentType: 'application/pdf',
      contentLength: 4,
    });

    await expect(service.downloadFile(user, fileRecord.id)).resolves.toEqual({
      file: expect.objectContaining({ id: fileRecord.id }),
      object: expect.objectContaining({ contentType: 'application/pdf' }),
    });

    expect(prismaService.organizationFile.findFirst).toHaveBeenCalledWith({
      where: {
        id: fileRecord.id,
        organizationId: user.organizationId,
        deletedAt: null,
      },
    });
  });

  it('throws not found when file is not in the current organization', async () => {
    prismaService.organizationFile.findFirst.mockResolvedValue(null);

    await expect(service.downloadFile(user, fileRecord.id)).rejects.toThrow(
      NotFoundException,
    );

    expect(objectStorageService.getObject).not.toHaveBeenCalled();
  });

  it('soft deletes only current organization files', async () => {
    prismaService.organizationFile.findFirst.mockResolvedValue(fileRecord);
    prismaService.organizationFile.update.mockResolvedValue({
      ...fileRecord,
      deletedAt: new Date(),
    });

    await service.deleteFile(user, fileRecord.id);

    expect(prismaService.organizationFile.findFirst).toHaveBeenCalledWith({
      where: {
        id: fileRecord.id,
        organizationId: user.organizationId,
        deletedAt: null,
      },
    });
    expect(prismaService.organizationFile.update).toHaveBeenCalledWith({
      where: { id: fileRecord.id },
      data: {
        deletedAt: expect.any(Date) as Date,
      },
    });
    expect(objectStorageService.deleteObject).toHaveBeenCalledWith(
      fileRecord.storageKey,
    );
    expect(
      objectStorageService.deleteObject.mock.invocationCallOrder[0],
    ).toBeLessThan(
      prismaService.organizationFile.update.mock.invocationCallOrder[0],
    );
  });
});
