import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FileProcessingStatus } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/types/authenticated-request';
import { PrismaService } from 'src/prisma/prisma-service';
import { RagAnswerRpcClient } from './answering/rag-answer-rpc.client';
import { RagService } from './rag.service';

const mockPrismaFn = () => jest.fn<Promise<unknown>, unknown[]>();

const prismaService = {
  organizationFile: {
    findFirst: mockPrismaFn(),
  },
  ragIngestionJob: {
    findUnique: mockPrismaFn(),
  },
};

const ragAnswerRpcClient = {
  ask: jest.fn<Promise<unknown>, unknown[]>(),
};

describe('RagService', () => {
  const user: AuthenticatedUser = {
    id: 'user-id',
    organizationId: 'organization-id',
    email: 'user@example.com',
  };
  const fileId = 'file-id';
  const question = 'What is in the document?';
  const chunks = [
    {
      chunkIndex: 0,
      sourceName: 'doc.txt',
      score: 0.92,
      text: 'Document context',
    },
  ];

  let service: RagService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RagService(
      prismaService as unknown as PrismaService,
      ragAnswerRpcClient as unknown as RagAnswerRpcClient,
    );

    prismaService.organizationFile.findFirst.mockResolvedValue({ id: fileId });
    prismaService.ragIngestionJob.findUnique.mockResolvedValue({
      status: FileProcessingStatus.COMPLETED,
    });
    ragAnswerRpcClient.ask.mockResolvedValue({
      fileId,
      question,
      answer: 'The answer is in the document. [1]',
      citations: chunks,
    });
  });

  it('answers a question using retrieved chunks', async () => {
    await expect(
      service.answerQuestion(user, fileId, question),
    ).resolves.toEqual({
      fileId,
      question,
      answer: 'The answer is in the document. [1]',
      citations: chunks,
    });

    expect(ragAnswerRpcClient.ask).toHaveBeenCalledWith(
      user.organizationId,
      fileId,
      question,
    );
  });

  it('rejects questions before ingestion is completed', async () => {
    prismaService.ragIngestionJob.findUnique.mockResolvedValue({
      status: FileProcessingStatus.PROCESSING,
    });

    await expect(
      service.answerQuestion(user, fileId, question),
    ).rejects.toThrow(BadRequestException);

    expect(ragAnswerRpcClient.ask).not.toHaveBeenCalled();
  });

  it('returns not found when the RAG microservice finds no chunks', async () => {
    ragAnswerRpcClient.ask.mockRejectedValue(
      new NotFoundException('No relevant document chunks found'),
    );

    await expect(
      service.answerQuestion(user, fileId, question),
    ).rejects.toThrow(NotFoundException);
  });
});
