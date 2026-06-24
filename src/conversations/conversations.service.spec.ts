import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { ConversationStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma-service';
import { ConversationsService } from './conversations.service';

const prismaService = {
  conversation: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

describe('ConversationsService', () => {
  let service: ConversationsService;

  const conversation = {
    id: 'conversation-id',
    userId: 'user-id',
    title: 'General chat',
    status: ConversationStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ConversationsService(
      prismaService as unknown as PrismaService,
    );
  });

  it('should create a conversation', async () => {
    const data = {
      userId: 'user-id',
      title: 'General chat',
    };

    prismaService.conversation.create.mockResolvedValue(conversation);

    await expect(service.create(data)).resolves.toEqual(conversation);
    expect(prismaService.conversation.create).toHaveBeenCalledWith({ data });
  });

  it('should find a conversation by id', async () => {
    prismaService.conversation.findFirst.mockResolvedValue(conversation);

    await expect(service.findById('conversation-id')).resolves.toEqual(
      conversation,
    );
    expect(prismaService.conversation.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'conversation-id',
        deletedAt: null,
      },
    });
  });

  it('should throw NotFoundException when conversation is not found', async () => {
    prismaService.conversation.findFirst.mockResolvedValue(null);

    await expect(service.findById('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should get all conversations', async () => {
    prismaService.conversation.findMany.mockResolvedValue([conversation]);

    await expect(service.getAll()).resolves.toEqual([conversation]);
    expect(prismaService.conversation.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  });

  it('should update a conversation', async () => {
    const data = {
      title: 'Updated chat',
    };
    const updatedConversation = {
      ...conversation,
      ...data,
    };

    prismaService.conversation.findFirst.mockResolvedValue(conversation);
    prismaService.conversation.update.mockResolvedValue(updatedConversation);

    await expect(service.update('conversation-id', data)).resolves.toEqual(
      updatedConversation,
    );
    expect(prismaService.conversation.update).toHaveBeenCalledWith({
      where: { id: 'conversation-id' },
      data,
    });
  });

  it('should soft delete a conversation', async () => {
    const deletedConversation = {
      ...conversation,
      status: ConversationStatus.ARCHIVED,
      deletedAt: new Date(),
    };

    prismaService.conversation.findFirst.mockResolvedValue(conversation);
    prismaService.conversation.update.mockResolvedValue(deletedConversation);

    await expect(service.delete('conversation-id')).resolves.toEqual(
      deletedConversation,
    );
    expect(prismaService.conversation.update).toHaveBeenCalledWith({
      where: { id: 'conversation-id' },
      data: {
        deletedAt: expect.any(Date) as Date,
        status: ConversationStatus.ARCHIVED,
      },
    });
  });
});
