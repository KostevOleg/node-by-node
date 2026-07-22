import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { AuthenticatedUser } from 'src/auth/types/authenticated-request';
import { prismaErrorHandler } from 'src/common/utils/prisma-error.handler';
import { serialize } from 'src/common/utils/serialize';
import { PrismaService } from 'src/prisma/prisma-service';
import { FileResponseDto } from './dto/files-response.dto';
import { ObjectStorageService } from './storage/object-storage.service';

@Injectable()
export class FilesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly objectStorageService: ObjectStorageService,
  ) {}
  private buildStorageKey(
    organizationId: string,
    fileId: string,
    extension: string,
  ): string {
    return `organizations/${organizationId}/files/${fileId}${extension}`;
  }
  private getFileExtension(originalName: string): string {
    return extname(originalName).toLowerCase();
  }
  private getSha256(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
  private validateFileExists(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.buffer?.length) {
      throw new BadRequestException('File is empty');
    }
  }

  private async findOrganizationFile(user: AuthenticatedUser, fileId: string) {
    const file = await prismaErrorHandler(() =>
      this.prismaService.organizationFile.findFirst({
        where: {
          id: fileId,
          organizationId: user.organizationId,
          deletedAt: null,
        },
      }),
    );

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async uploadFile(user: AuthenticatedUser, file: Express.Multer.File) {
    this.validateFileExists(file);

    const extension = this.getFileExtension(file.originalname);
    const sha256 = this.getSha256(file.buffer);
    const fileId = randomUUID();

    const storageKey = this.buildStorageKey(
      user.organizationId,
      fileId,
      extension,
    );

    const duplicate = await prismaErrorHandler(() =>
      this.prismaService.organizationFile.findFirst({
        where: {
          organizationId: user.organizationId,
          sha256,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      }),
    );

    if (duplicate) {
      throw new ConflictException('File already exists in this organization');
    }

    await this.objectStorageService.putObject(
      storageKey,
      file.buffer,
      file.mimetype,
    );

    try {
      const createdFile = await prismaErrorHandler(() =>
        this.prismaService.organizationFile.create({
          data: {
            id: fileId,
            organizationId: user.organizationId,
            uploadedById: user.id,
            originalName: file.originalname,
            storageKey,
            mimeType: file.mimetype,
            extension,
            size: file.size,
            sha256,
          },
        }),
      );

      return serialize(FileResponseDto, createdFile);
    } catch (error) {
      await this.objectStorageService.deleteObject(storageKey);
      throw error;
    }
  }

  async getFilesPage(user: AuthenticatedUser, cursor?: string, take = 50) {
    const pageSize = Math.min(Math.max(take, 1), 100);

    const files = await prismaErrorHandler(() =>
      this.prismaService.organizationFile.findMany({
        where: {
          organizationId: user.organizationId,
          deletedAt: null,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pageSize + 1,
        ...(cursor
          ? {
              cursor: {
                id: cursor,
              },
              skip: 1,
            }
          : {}),
      }),
    );

    const hasNextPage = files.length > pageSize;
    const data = hasNextPage ? files.slice(0, pageSize) : files;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      data: serialize(FileResponseDto, data),
      nextCursor,
    };
  }

  async downloadFile(user: AuthenticatedUser, fileId: string) {
    const file = await this.findOrganizationFile(user, fileId);
    const object = await this.objectStorageService.getObject(file.storageKey);

    return {
      file: serialize(FileResponseDto, file),
      object,
    };
  }

  async deleteFile(user: AuthenticatedUser, fileId: string) {
    const file = await this.findOrganizationFile(user, fileId);

    await prismaErrorHandler(() =>
      this.prismaService.organizationFile.update({
        where: { id: file.id },
        data: {
          deletedAt: new Date(),
        },
      }),
    );

    await this.objectStorageService.deleteObject(file.storageKey);
  }
}
