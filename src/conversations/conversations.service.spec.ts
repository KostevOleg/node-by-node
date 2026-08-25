import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  ConversationStatus,
  MessageSender,
  MessageStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma-service';
import { AuthenticatedUser } from 'src/auth/types/authenticated-request';
import { ConversationsService } from './conversations.service';
import { ChatMapper } from './mappers/chat.mapper';
import { ChatErrorCode } from './graphql/chat-error-code';
import { ChatGraphqlException } from './graphql/chat.exception';
import { ChatRealtimeService } from './websocket/chat-realtime.service';

const mockPrismaFn = () => jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockTransactionFn = () =>
  jest.fn<(callback: (tx: unknown) => unknown) => unknown>();

const prismaService = {
  $transaction: mockTransactionFn(),
  user: {
    findFirst: mockPrismaFn(),
  },
  conversation: {
    create: mockPrismaFn(),
    delete: mockPrismaFn(),
    findFirst: mockPrismaFn(),
    findMany: mockPrismaFn(),
  },
  conversationParticipant: {
    createMany: mockPrismaFn(),
    deleteMany: mockPrismaFn(),
  },
  message: {
    create: mockPrismaFn(),
    delete: mockPrismaFn(),
    deleteMany: mockPrismaFn(),
    findFirst: mockPrismaFn(),
    findMany: mockPrismaFn(),
    update: mockPrismaFn(),
  },
};

const chatRealtimeService = {
  broadcastChatCreated: jest.fn(),
  broadcastChatDeleted: jest.fn(),
  broadcastChatMessageCreated: jest.fn(),
  broadcastMessageCreated: jest.fn(),
  broadcastMessageDeleted: jest.fn(),
  broadcastMessageUpdated: jest.fn(),
};

describe('ConversationsService', () => {
  let service: ConversationsService;

  const createdAt = new Date('2026-08-12T10:00:00.000Z');
  const updatedAt = new Date('2026-08-12T10:01:00.000Z');
  const user: AuthenticatedUser = {
    id: '11111111-1111-1111-1111-111111111111',
    organizationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'first@example.com',
  };
  const participant = {
    id: '22222222-2222-2222-2222-222222222222',
    organizationId: user.organizationId,
    email: 'second@example.com',
    firstName: 'Second',
    lastName: 'User',
    status: 'ACTIVE',
    deletedAt: null,
  };
  const message = {
    id: '33333333-3333-3333-3333-333333333333',
    conversationId: '44444444-4444-4444-4444-444444444444',
    senderId: user.id,
    sender: MessageSender.USER,
    content: 'Hello there',
    status: MessageStatus.SENT,
    tokenCount: 2,
    createdAt,
    updatedAt,
    deletedAt: null,
  };
  const chat = {
    id: message.conversationId,
    organizationId: user.organizationId,
    userId: user.id,
    firstUserId: user.id,
    secondUserId: participant.id,
    status: ConversationStatus.ACTIVE,
    createdAt,
    updatedAt,
    deletedAt: null,
    participants: [
      {
        conversationId: message.conversationId,
        userId: user.id,
        createdAt,
        user: {
          id: user.id,
          email: user.email,
          firstName: 'First',
          lastName: 'User',
        },
      },
      {
        conversationId: message.conversationId,
        userId: participant.id,
        createdAt,
        user: {
          id: participant.id,
          email: participant.email,
          firstName: participant.firstName,
          lastName: participant.lastName,
        },
      },
    ],
    messages: [message],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prismaService.$transaction.mockImplementation((callback) =>
      callback(prismaService),
    );
    service = new ConversationsService(
      prismaService as unknown as PrismaService,
      new ChatMapper(),
      chatRealtimeService as unknown as ChatRealtimeService,
    );
  });

  it('creates a two-user chat in the current organization with the first message', async () => {
    prismaService.user.findFirst.mockResolvedValue(participant);
    prismaService.conversation.findFirst.mockResolvedValue(null);
    prismaService.conversation.create.mockResolvedValue(chat);
    prismaService.message.create.mockResolvedValue(message);
    prismaService.conversation.findUniqueOrThrow =
      mockPrismaFn().mockResolvedValue(chat);

    await expect(
      service.createChat(user, {
        participantId: participant.id,
        firstMessage: message.content,
      }),
    ).resolves.toMatchObject({
      id: chat.id,
      organizationId: user.organizationId,
      participants: [
        expect.objectContaining({ userId: user.id }),
        expect.objectContaining({ userId: participant.id }),
      ],
      lastMessage: expect.objectContaining({
        id: message.id,
        senderId: user.id,
      }),
    });

    expect(prismaService.conversation.create).toHaveBeenCalledWith({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        firstUserId: user.id,
        secondUserId: participant.id,
      },
    });
    expect(
      prismaService.conversationParticipant.createMany,
    ).toHaveBeenCalledWith({
      data: [
        { conversationId: chat.id, userId: user.id },
        { conversationId: chat.id, userId: participant.id },
      ],
    });
    expect(prismaService.message.create).toHaveBeenCalledWith({
      data: {
        conversationId: chat.id,
        senderId: user.id,
        content: message.content,
        sender: MessageSender.USER,
        tokenCount: 2,
        status: MessageStatus.SENT,
      },
    });
    expect(chatRealtimeService.broadcastChatCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        id: chat.id,
        lastMessage: expect.objectContaining({
          id: message.id,
        }),
      }),
    );
  });

  it('returns an existing chat for the same user pair', async () => {
    prismaService.user.findFirst.mockResolvedValue(participant);
    prismaService.conversation.findFirst.mockResolvedValue(chat);

    await expect(
      service.createChat(user, {
        participantId: participant.id,
        firstMessage: 'Ignored because the chat already exists',
      }),
    ).resolves.toMatchObject({ id: chat.id });

    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('returns a concurrently created chat when direct chat creation hits a unique conflict', async () => {
    prismaService.user.findFirst.mockResolvedValue(participant);
    prismaService.conversation.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(chat);
    prismaService.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.createChat(user, {
        participantId: participant.id,
        firstMessage: 'Created by a concurrent request',
      }),
    ).resolves.toMatchObject({ id: chat.id });

    expect(prismaService.conversation.findFirst).toHaveBeenCalledTimes(2);
    expect(chatRealtimeService.broadcastChatCreated).not.toHaveBeenCalled();
  });

  it('rejects chats with yourself or users from another organization', async () => {
    prismaService.user.findFirst.mockResolvedValue({
      ...participant,
      id: user.id,
    });

    await expect(
      service.createChat(user, {
        participantId: user.id,
        firstMessage: 'Hello',
      }),
    ).rejects.toMatchObject({
      extensions: {
        code: ChatErrorCode.CannotChatWithYourself,
        httpStatus: 400,
      },
    });

    prismaService.user.findFirst.mockResolvedValue({
      ...participant,
      organizationId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    });

    await expect(
      service.createChat(user, {
        participantId: participant.id,
        firstMessage: 'Hello',
      }),
    ).rejects.toMatchObject({
      extensions: {
        code: ChatErrorCode.ParticipantFromAnotherOrganization,
        httpStatus: 403,
      },
    });
  });

  it('sends a message only to an accessible chat', async () => {
    prismaService.conversation.findFirst.mockResolvedValue({
      participants: [{ userId: user.id }, { userId: participant.id }],
    });
    prismaService.message.create.mockResolvedValue(message);

    await expect(
      service.sendMessage(user, {
        chatId: chat.id,
        content: message.content,
      }),
    ).resolves.toMatchObject({
      id: message.id,
      chatId: chat.id,
      senderId: user.id,
      content: message.content,
    });

    expect(prismaService.conversation.findFirst).toHaveBeenCalledWith({
      where: {
        id: chat.id,
        organizationId: user.organizationId,
        deletedAt: null,
        participants: {
          some: {
            userId: user.id,
          },
        },
      },
      select: {
        participants: {
          select: {
            userId: true,
          },
        },
      },
    });
    expect(chatRealtimeService.broadcastMessageCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        id: message.id,
        chatId: chat.id,
        senderId: user.id,
      }),
    );
    expect(
      chatRealtimeService.broadcastChatMessageCreated,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        id: message.id,
        chatId: chat.id,
        senderId: user.id,
      }),
      [user.id, participant.id],
    );
  });

  it('updates and hard deletes only messages sent by the current user', async () => {
    prismaService.message.findFirst.mockResolvedValue(message);
    prismaService.message.update.mockResolvedValue({
      ...message,
      content: 'Updated text',
      tokenCount: 2,
    });
    prismaService.message.delete.mockResolvedValue(message);

    await expect(
      service.updateMessage(user, {
        messageId: message.id,
        content: 'Updated text',
      }),
    ).resolves.toMatchObject({
      id: message.id,
      content: 'Updated text',
    });
    expect(prismaService.message.update).toHaveBeenCalledWith({
      where: {
        id: message.id,
      },
      data: {
        content: 'Updated text',
        tokenCount: 2,
      },
    });
    expect(chatRealtimeService.broadcastMessageUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        id: message.id,
        chatId: chat.id,
        content: 'Updated text',
      }),
    );

    await expect(
      service.deleteMessage(user, message.id),
    ).resolves.toMatchObject({
      id: message.id,
    });
    expect(prismaService.message.delete).toHaveBeenCalledWith({
      where: {
        id: message.id,
      },
    });
    expect(chatRealtimeService.broadcastMessageDeleted).toHaveBeenCalledWith(
      expect.objectContaining({
        id: message.id,
        chatId: chat.id,
      }),
    );
  });

  it('hard deletes a chat with its messages and participants', async () => {
    prismaService.conversation.findFirst
      .mockResolvedValueOnce({ id: chat.id })
      .mockResolvedValueOnce({
        participants: [{ userId: user.id }, { userId: participant.id }],
      });

    await expect(service.deleteChat(user, chat.id)).resolves.toBe(true);

    expect(prismaService.message.deleteMany).toHaveBeenCalledWith({
      where: {
        conversationId: chat.id,
      },
    });
    expect(
      prismaService.conversationParticipant.deleteMany,
    ).toHaveBeenCalledWith({
      where: {
        conversationId: chat.id,
      },
    });
    expect(prismaService.conversation.delete).toHaveBeenCalledWith({
      where: {
        id: chat.id,
      },
    });
    expect(chatRealtimeService.broadcastChatDeleted).toHaveBeenCalledWith(
      chat.id,
      [user.id, participant.id],
    );
  });

  it('paginates current user chats and messages', async () => {
    const secondChat = { ...chat, id: '55555555-5555-5555-5555-555555555555' };
    prismaService.conversation.findMany.mockResolvedValue([chat, secondChat]);
    prismaService.conversation.findFirst.mockResolvedValue({ id: chat.id });
    prismaService.message.findMany.mockResolvedValue([
      message,
      { ...message, id: '66666666-6666-6666-6666-666666666666' },
    ]);

    await expect(service.getMyChats(user, { take: 1 })).resolves.toEqual({
      data: [expect.objectContaining({ id: chat.id })],
      nextCursor: chat.id,
    });

    await expect(
      service.getChatMessages(user, { chatId: chat.id, take: 1 }),
    ).resolves.toEqual({
      data: [expect.objectContaining({ id: message.id })],
      nextCursor: message.id,
    });
  });

  it('returns chat messages with a null senderId', async () => {
    prismaService.conversation.findFirst.mockResolvedValue({ id: chat.id });
    prismaService.message.findMany.mockResolvedValue([
      { ...message, senderId: null },
    ]);

    await expect(
      service.getChatMessages(user, { chatId: chat.id, take: 1 }),
    ).resolves.toEqual({
      data: [expect.objectContaining({ id: message.id, senderId: null })],
      nextCursor: null,
    });
  });

  it('throws coded GraphQL errors when a chat or message is inaccessible', async () => {
    prismaService.conversation.findFirst.mockResolvedValue(null);

    await expect(
      service.sendMessage(user, {
        chatId: chat.id,
        content: 'Hello',
      }),
    ).rejects.toMatchObject({
      extensions: {
        code: ChatErrorCode.ChatNotFound,
        httpStatus: 404,
      },
    });

    prismaService.message.findFirst.mockResolvedValue(null);

    await expect(service.deleteMessage(user, message.id)).rejects.toMatchObject(
      {
        extensions: {
          code: ChatErrorCode.MessageNotFound,
          httpStatus: 404,
        },
      },
    );
  });

  it('throws a coded GraphQL error when participant is not found', async () => {
    prismaService.user.findFirst.mockResolvedValue(null);

    await expect(
      service.createChat(user, {
        participantId: participant.id,
        firstMessage: 'Hello',
      }),
    ).rejects.toMatchObject({
      constructor: ChatGraphqlException,
      extensions: {
        code: ChatErrorCode.ParticipantNotFound,
        httpStatus: 404,
      },
    });
  });
});
