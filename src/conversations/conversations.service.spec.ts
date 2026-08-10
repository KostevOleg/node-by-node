import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import {
  ConversationStatus,
  MessageSender,
  MessageStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma-service';
import { ConversationsService } from './conversations.service';
import { conversationPublicSelect } from './conversation.select';
import { messagePublicSelect } from 'src/messages/message.select';

const mockPrismaFn = () => jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockTransactionFn = () =>
  jest.fn<(callback: (tx: unknown) => unknown) => unknown>();

const prismaService = {
  $transaction: mockTransactionFn(),
  conversation: {
    create: mockPrismaFn(),
    findFirst: mockPrismaFn(),
    findMany: mockPrismaFn(),
    update: mockPrismaFn(),
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

  const publicConversation = {
    id: conversation.id,
    userId: conversation.userId,
    title: conversation.title,
    status: conversation.status,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };

  const publicMessage = {
    id: message.id,
    conversationId: message.conversationId,
    sender: message.sender,
    content: message.content,
    status: message.status,
    tokenCount: message.tokenCount,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
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

    await expect(service.create(data)).resolves.toMatchObject(
      publicConversation,
    );
    expect(prismaService.conversation.create).toHaveBeenCalledWith({
      data,
      select: conversationPublicSelect,
    });
  });

  it('should create a conversation with its first message in a transaction', async () => {
    const tx = {
      conversation: {
        create: mockPrismaFn().mockResolvedValue(conversation),
      },
      message: {
        create: mockPrismaFn().mockResolvedValue(message),
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
      conversation: expect.objectContaining(publicConversation),
      message: expect.objectContaining(publicMessage),
    });

    expect(prismaService.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
    );
    expect(tx.conversation.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-id',
        title: 'General chat',
      },
      select: conversationPublicSelect,
    });
    expect(tx.message.create).toHaveBeenCalledWith({
      data: {
        conversationId: 'conversation-id',
        sender: MessageSender.USER,
        content: 'Hello',
        tokenCount: 1,
        status: undefined,
      },
      select: messagePublicSelect,
    });
  });

  it('should fail the transaction when the first message cannot be created', async () => {
    const error = new Error('Message create failed');
    const tx = {
      conversation: {
        create: mockPrismaFn().mockResolvedValue(conversation),
      },
      message: {
        create: mockPrismaFn().mockRejectedValue(error),
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

    await expect(service.findById('conversation-id')).resolves.toMatchObject(
      publicConversation,
    );
    expect(prismaService.conversation.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'conversation-id',
        deletedAt: null,
      },
      select: conversationPublicSelect,
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

    await expect(service.getAll()).resolves.toMatchObject([publicConversation]);
    expect(prismaService.conversation.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: conversationPublicSelect,
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
      data: [expect.objectContaining(publicConversation)],
      nextCursor: 'conversation-id',
    });
    expect(prismaService.conversation.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 2,
      select: conversationPublicSelect,
    });
  });

  it('should get a user conversations page with cursor', async () => {
    prismaService.conversation.findMany.mockResolvedValue([conversation]);

    await expect(
      service.getUserConversationsPage('user-id', 'cursor-id', 10),
    ).resolves.toEqual({
      data: [expect.objectContaining(publicConversation)],
      nextCursor: null,
    });
    expect(prismaService.conversation.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-id',
        deletedAt: null,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 11,
      select: conversationPublicSelect,
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

    await expect(
      service.update('conversation-id', data),
    ).resolves.toMatchObject({
      ...publicConversation,
      ...data,
    });
    expect(prismaService.conversation.update).toHaveBeenCalledWith({
      where: { id: 'conversation-id' },
      data,
      select: conversationPublicSelect,
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
        deletedAt: expect.any(Date) as unknown as Date,
        status: ConversationStatus.ARCHIVED,
      },
    });
  });
});
