import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { MessageSender, MessageStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma-service';
import { MessagesService } from './messages.service';
import { messagePublicSelect } from './message.select';

const mockPrismaFn = () => jest.fn<(...args: unknown[]) => Promise<unknown>>();

const prismaService = {
  message: {
    create: mockPrismaFn(),
    findFirst: mockPrismaFn(),
    findMany: mockPrismaFn(),
    update: mockPrismaFn(),
  },
};

describe('MessagesService', () => {
  let service: MessagesService;

  const message = {
    id: 'message-id',
    conversationId: 'conversation-id',
    sender: MessageSender.USER,
    content: 'Hello',
    status: MessageStatus.SENT,
    tokenCount: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
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
    service = new MessagesService(prismaService as unknown as PrismaService);
  });

  it('should create a message', async () => {
    const data = {
      conversationId: 'conversation-id',
      sender: MessageSender.USER,
      content: 'Hello',
      tokenCount: 3,
    };

    prismaService.message.create.mockResolvedValue(message);

    await expect(service.create(data)).resolves.toMatchObject(publicMessage);
    expect(prismaService.message.create).toHaveBeenCalledWith({
      data,
      select: messagePublicSelect,
    });
  });

  it('should find a message by id', async () => {
    prismaService.message.findFirst.mockResolvedValue(message);

    await expect(service.findById('message-id')).resolves.toMatchObject(
      publicMessage,
    );
    expect(prismaService.message.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'message-id',
        deletedAt: null,
      },
      select: messagePublicSelect,
    });
  });

  it('should throw NotFoundException when message is not found', async () => {
    prismaService.message.findFirst.mockResolvedValue(null);

    await expect(service.findById('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should get all messages', async () => {
    prismaService.message.findMany.mockResolvedValue([message]);

    await expect(service.getAll()).resolves.toMatchObject([publicMessage]);
    expect(prismaService.message.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: messagePublicSelect,
    });
  });

  it('should get a messages page', async () => {
    const secondMessage = {
      ...message,
      id: 'second-message-id',
    };

    prismaService.message.findMany.mockResolvedValue([message, secondMessage]);

    await expect(service.getMessagesPage(undefined, 1)).resolves.toEqual({
      data: [expect.objectContaining(publicMessage)],
      nextCursor: 'message-id',
    });
    expect(prismaService.message.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 2,
      select: messagePublicSelect,
    });
  });

  it('should get a conversation messages page with cursor', async () => {
    prismaService.message.findMany.mockResolvedValue([message]);

    await expect(
      service.getConversationMessagesPage('conversation-id', 'cursor-id', 10),
    ).resolves.toEqual({
      data: [expect.objectContaining(publicMessage)],
      nextCursor: null,
    });
    expect(prismaService.message.findMany).toHaveBeenCalledWith({
      where: {
        conversationId: 'conversation-id',
        deletedAt: null,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 11,
      select: messagePublicSelect,
      cursor: {
        id: 'cursor-id',
      },
      skip: 1,
    });
  });

  it('should update a message', async () => {
    const data = {
      content: 'Updated message',
    };
    const updatedMessage = {
      ...message,
      ...data,
    };

    prismaService.message.findFirst.mockResolvedValue(message);
    prismaService.message.update.mockResolvedValue(updatedMessage);

    await expect(service.update('message-id', data)).resolves.toMatchObject({
      ...publicMessage,
      ...data,
    });
    expect(prismaService.message.update).toHaveBeenCalledWith({
      where: { id: 'message-id' },
      data,
      select: messagePublicSelect,
    });
  });

  it('should soft delete a message', async () => {
    const deletedMessage = {
      ...message,
      deletedAt: new Date(),
    };

    prismaService.message.findFirst.mockResolvedValue(message);
    prismaService.message.update.mockResolvedValue(deletedMessage);

    await expect(service.delete('message-id')).resolves.toEqual(deletedMessage);
    expect(prismaService.message.update).toHaveBeenCalledWith({
      where: { id: 'message-id' },
      data: {
        deletedAt: expect.any(Date) as unknown as Date,
      },
    });
  });
});
