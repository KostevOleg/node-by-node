import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FileProcessingStatus } from '@prisma/client';
import { RagIngestionStatusResponseDto } from './dto/rag-ingestion-status-response.dto';
import { PrismaService } from 'src/prisma/prisma-service';
import { AuthenticatedUser } from 'src/auth/types/authenticated-request';
import { RagAnswerResponseDto } from './dto/ask-rag-question.dto';
import {
  RagFilePageResponseDto,
  RagFileResponseDto,
} from './dto/rag-file-response.dto';
import { serialize } from 'src/common/utils/serialize';
import { RagAnswerRpcClient } from './answering/rag-answer-rpc.client';

@Injectable()
export class RagService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly ragAnswerRpcClient: RagAnswerRpcClient,
  ) {}

  async assertCanAccessFile(
    user: AuthenticatedUser,
    fileId: string,
  ): Promise<void> {
    await this.findAccessibleFile(user, fileId);
  }

  async getIngestionStatus(
    user: AuthenticatedUser,
    fileId: string,
  ): Promise<RagIngestionStatusResponseDto> {
    await this.findAccessibleFile(user, fileId);

    const job = await this.prismaService.ragIngestionJob.findUnique({
      where: {
        fileId,
      },
    });

    if (!job) {
      throw new NotFoundException('RAG ingestion job not found');
    }

    return {
      fileId,
      status: job.status,
      chunksCount: job.chunksCount,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      failedAt: job.failedAt,
      errorMessage: job.errorMessage,
    };
  }

  async getRagFilesPage(
    user: AuthenticatedUser,
    cursor?: string,
    take = 50,
  ): Promise<RagFilePageResponseDto> {
    const pageSize = Math.min(Math.max(take, 1), 100);

    const files = await this.prismaService.organizationFile.findMany({
      where: {
        organizationId: user.organizationId,
        deletedAt: null,
        ragIngestionJob: {
          isNot: null,
        },
      },
      include: {
        ragIngestionJob: true,
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
    });

    const hasNextPage = files.length > pageSize;
    const data = hasNextPage ? files.slice(0, pageSize) : files;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      data: serialize(
        RagFileResponseDto,
        data.map((file) => ({
          id: file.id,
          originalName: file.originalName,
          mimeType: file.mimeType,
          extension: file.extension,
          size: file.size,
          createdAt: file.createdAt,
          ragStatus: file.ragIngestionJob?.status,
          chunksCount: file.ragIngestionJob?.chunksCount,
          ragStartedAt: file.ragIngestionJob?.startedAt,
          ragCompletedAt: file.ragIngestionJob?.completedAt,
          ragFailedAt: file.ragIngestionJob?.failedAt,
          ragErrorMessage: file.ragIngestionJob?.errorMessage,
        })),
      ),
      nextCursor,
    };
  }

  private async findAccessibleFile(user: AuthenticatedUser, fileId: string) {
    const file = await this.prismaService.organizationFile.findFirst({
      where: {
        id: fileId,
        organizationId: user.organizationId,
        deletedAt: null,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async answerQuestion(
    user: AuthenticatedUser,
    fileId: string,
    question: string,
  ): Promise<RagAnswerResponseDto> {
    await this.findAccessibleFile(user, fileId);

    const job = await this.prismaService.ragIngestionJob.findUnique({
      where: {
        fileId,
      },
    });

    if (!job) {
      throw new NotFoundException('RAG ingestion job not found');
    }

    if (job.status !== FileProcessingStatus.COMPLETED) {
      throw new BadRequestException('RAG ingestion is not completed yet');
    }

    return this.ragAnswerRpcClient.ask(user.organizationId, fileId, question);
  }
}
