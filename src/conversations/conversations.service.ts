import { Injectable } from '@nestjs/common';
import { MessageSender, MessageStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma-service';
import { prismaErrorHandler } from 'src/common/utils/prisma-error.handler';
import {
  ChatMessagesInput,
  ChatPageInput,
  CreateChatInput,
  SendMessageInput,
  UpdateMessageInput,
} from './graphql/chat.inputs';
import { ChatMessagePageObject, ChatPageObject } from './graphql/chat.types';
import { AuthenticatedUser } from 'src/auth/types/authenticated-request';
import { ChatMapper } from './mappers/chat.mapper';
import { ChatErrorCode } from './graphql/chat-error-code';
import { ChatGraphqlException } from './graphql/chat.exception';
@Injectable()
export class ConversationsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly chatMapper: ChatMapper,
  ) {}

  async createChat(user: AuthenticatedUser, input: CreateChatInput) {
    const participant = await prismaErrorHandler(() =>
      this.prismaService.user.findFirst({
        where: {
          id: input.participantId,
          deletedAt: null,
          status: 'ACTIVE',
        },
      }),
    );
    if (!participant) {
      throw new ChatGraphqlException(
        'Participant not found',
        ChatErrorCode.ParticipantNotFound,
        404,
      );
    }

    if (participant.id === user.id) {
      throw new ChatGraphqlException(
        'Cannot create a chat with yourself',
        ChatErrorCode.CannotChatWithYourself,
        400,
      );
    }

    if (participant.organizationId !== user.organizationId) {
      throw new ChatGraphqlException(
        'Participant belongs to another organization',
        ChatErrorCode.ParticipantFromAnotherOrganization,
        403,
      );
    }
    const [firstUserId, secondUserId] = [user.id, participant.id].sort();

    const existingChat = await prismaErrorHandler(() =>
      this.prismaService.conversation.findFirst({
        where: {
          organizationId: user.organizationId,
          firstUserId,
          secondUserId,
          deletedAt: null,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          participants: {
            include: {
              user: true,
            },
          },
          messages: {
            where: {
              deletedAt: null,
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 1,
          },
        },
      }),
    );

    if (existingChat) {
      return this.chatMapper.toChatObject(existingChat);
    }

    const chat = await prismaErrorHandler(() =>
      this.prismaService.$transaction(async (tx) => {
        const conversation = await tx.conversation.create({
          data: {
            organizationId: user.organizationId,
            userId: user.id,
            firstUserId,
            secondUserId,
          },
        });
        await tx.conversationParticipant.createMany({
          data: [
            {
              conversationId: conversation.id,
              userId: user.id,
            },
            {
              conversationId: conversation.id,
              userId: participant.id,
            },
          ],
        });
        await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderId: user.id,
            content: input.firstMessage,
            sender: MessageSender.USER,
            tokenCount: input.firstMessage.trim().split(/\s+/).length,
            status: MessageStatus.SENT,
          },
        });

        return tx.conversation.findUniqueOrThrow({
          where: {
            id: conversation.id,
          },
          include: {
            participants: {
              include: {
                user: true,
              },
            },
            messages: {
              where: {
                deletedAt: null,
              },
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
              take: 1,
            },
          },
        });
      }),
    );

    return this.chatMapper.toChatObject(chat);
  }

  async sendMessage(user: AuthenticatedUser, input: SendMessageInput) {
    await this.findAccessibleChatOrThrow(user, input.chatId);

    const message = await prismaErrorHandler(() =>
      this.prismaService.message.create({
        data: {
          conversationId: input.chatId,
          senderId: user.id,
          sender: MessageSender.USER,
          content: input.content,
          tokenCount: input.content.trim().split(/\s+/).length,
          status: MessageStatus.SENT,
        },
      }),
    );

    return this.chatMapper.toChatMessageObject(message);
  }

  async deleteMessage(user: AuthenticatedUser, messageId: string) {
    const message = await this.findOwnAccessibleMessageOrThrow(user, messageId);

    const deletedMessage = await prismaErrorHandler(() =>
      this.prismaService.message.delete({
        where: {
          id: message.id,
        },
      }),
    );

    return this.chatMapper.toChatMessageObject(deletedMessage);
  }

  async updateMessage(user: AuthenticatedUser, input: UpdateMessageInput) {
    const message = await this.findOwnAccessibleMessageOrThrow(
      user,
      input.messageId,
    );

    const updatedMessage = await prismaErrorHandler(() =>
      this.prismaService.message.update({
        where: {
          id: message.id,
        },
        data: {
          content: input.content,
          tokenCount: input.content.trim().split(/\s+/).length,
        },
      }),
    );

    return this.chatMapper.toChatMessageObject(updatedMessage);
  }

  async deleteChat(user: AuthenticatedUser, chatId: string) {
    const chat = await this.findAccessibleChatOrThrow(user, chatId);

    await prismaErrorHandler(() =>
      this.prismaService.$transaction(async (tx) => {
        await tx.message.deleteMany({
          where: {
            conversationId: chat.id,
          },
        });

        await tx.conversationParticipant.deleteMany({
          where: {
            conversationId: chat.id,
          },
        });

        await tx.conversation.delete({
          where: {
            id: chat.id,
          },
        });
      }),
    );

    return true;
  }

  async getMyChats(
    user: AuthenticatedUser,
    input?: ChatPageInput,
  ): Promise<ChatPageObject> {
    const pageSize = Math.min(Math.max(input?.take ?? 30, 1), 100);
    const chats = await prismaErrorHandler(() =>
      this.prismaService.conversation.findMany({
        where: this.getAccessibleChatWhere(user),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pageSize + 1,
        include: {
          participants: {
            include: {
              user: true,
            },
          },
          messages: {
            where: {
              deletedAt: null,
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 1,
          },
        },
        ...(input?.cursor
          ? {
              cursor: {
                id: input.cursor,
              },
              skip: 1,
            }
          : {}),
      }),
    );
    const hasNextPage = chats.length > pageSize;
    const data = hasNextPage ? chats.slice(0, pageSize) : chats;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;
    return {
      data: data.map((chat) => this.chatMapper.toChatObject(chat)),
      nextCursor,
    };
  }

  async getChatMessages(
    user: AuthenticatedUser,
    input: ChatMessagesInput,
  ): Promise<ChatMessagePageObject> {
    const pageSize = Math.min(Math.max(input.take ?? 30, 1), 100);
    await this.findAccessibleChatOrThrow(user, input.chatId);

    const messages = await prismaErrorHandler(() =>
      this.prismaService.message.findMany({
        where: {
          conversationId: input.chatId,
          deletedAt: null,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: pageSize + 1,
        ...(input.cursor
          ? {
              cursor: {
                id: input.cursor,
              },
              skip: 1,
            }
          : {}),
      }),
    );

    const hasNextPage = messages.length > pageSize;
    const data = hasNextPage ? messages.slice(0, pageSize) : messages;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      data: data.map((message) => this.chatMapper.toChatMessageObject(message)),
      nextCursor,
    };
  }

  private getAccessibleChatWhere(
    user: AuthenticatedUser,
    chatId?: string,
  ): Prisma.ConversationWhereInput {
    return {
      ...(chatId ? { id: chatId } : {}),
      organizationId: user.organizationId,
      deletedAt: null,
      participants: {
        some: {
          userId: user.id,
        },
      },
    };
  }

  private getOwnAccessibleMessageWhere(
    user: AuthenticatedUser,
    messageId: string,
  ): Prisma.MessageWhereInput {
    return {
      id: messageId,
      deletedAt: null,
      senderId: user.id,
      conversation: this.getAccessibleChatWhere(user),
    };
  }

  private async findAccessibleChatOrThrow(
    user: AuthenticatedUser,
    chatId: string,
  ) {
    const chat = await prismaErrorHandler(() =>
      this.prismaService.conversation.findFirst({
        where: this.getAccessibleChatWhere(user, chatId),
        select: {
          id: true,
        },
      }),
    );

    if (!chat) {
      throw new ChatGraphqlException(
        'Chat not found',
        ChatErrorCode.ChatNotFound,
        404,
      );
    }

    return chat;
  }

  private async findOwnAccessibleMessageOrThrow(
    user: AuthenticatedUser,
    messageId: string,
  ) {
    const message = await prismaErrorHandler(() =>
      this.prismaService.message.findFirst({
        where: this.getOwnAccessibleMessageWhere(user, messageId),
      }),
    );

    if (!message) {
      throw new ChatGraphqlException(
        'Message not found',
        ChatErrorCode.MessageNotFound,
        404,
      );
    }

    return message;
  }
}
