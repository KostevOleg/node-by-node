import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import {
  ConversationStatus,
  MessageSender,
  MessageStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma-service';
import { ConversationsService } from './conversations.service';

const prismaService = {
  $transaction: jest.fn(),
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

  const message = {
    id: 'message-id',
    conversationId: 'conversation-id',
    sender: MessageSender.USER,
    content: 'Hello',
    status: MessageStatus.SENT,
    tokenCount: 1,
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

  it('should create a conversation with its first message in a transaction', async () => {
    const tx = {
      conversation: {
        create: jest.fn().mockResolvedValue(conversation),
      },
      message: {
        create: jest.fn().mockResolvedValue(message),
      },
    };

    prismaService.$transaction.mockImplementation((callback) => callback(tx));

    await expect(
      service.createWithFirstMessage({
        userId: 'user-id',
        title: 'General chat',
        message: {
          sender: MessageSender.USER,
          content: 'Hello',
          tokenCount: 1,
        },
      }),
    ).resolves.toEqual({
      conversation,
      message,
    });

    expect(prismaService.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
    );
    expect(tx.conversation.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-id',
        title: 'General chat',
      },
    });
    expect(tx.message.create).toHaveBeenCalledWith({
      data: {
        conversationId: 'conversation-id',
        sender: MessageSender.USER,
        content: 'Hello',
        tokenCount: 1,
        status: undefined,
      },
    });
  });

  it('should fail the transaction when the first message cannot be created', async () => {
    const error = new Error('Message create failed');
    const tx = {
      conversation: {
        create: jest.fn().mockResolvedValue(conversation),
      },
      message: {
        create: jest.fn().mockRejectedValue(error),
      },
    };

    prismaService.$transaction.mockImplementation((callback) => callback(tx));

    await expect(
      service.createWithFirstMessage({
        userId: 'user-id',
        title: 'General chat',
        message: {
          sender: MessageSender.USER,
          content: 'Hello',
          tokenCount: 1,
        },
      }),
    ).rejects.toThrow('Database error');

    expect(tx.conversation.create).toHaveBeenCalled();
    expect(tx.message.create).toHaveBeenCalled();
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

  it('should get a conversations page', async () => {
    const secondConversation = {
      ...conversation,
      id: 'second-conversation-id',
    };

    prismaService.conversation.findMany.mockResolvedValue([
      conversation,
      secondConversation,
    ]);

    await expect(service.getConversationsPage(undefined, 1)).resolves.toEqual({
      data: [conversation],
      nextCursor: 'conversation-id',
    });
    expect(prismaService.conversation.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 2,
    });
  });

  it('should get a user conversations page with cursor', async () => {
    prismaService.conversation.findMany.mockResolvedValue([conversation]);

    await expect(
      service.getUserConversationsPage('user-id', 'cursor-id', 10),
    ).resolves.toEqual({
      data: [conversation],
      nextCursor: null,
    });
    expect(prismaService.conversation.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-id',
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 11,
      cursor: {
        id: 'cursor-id',
      },
      skip: 1,
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
