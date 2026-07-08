import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ConversationStatus,
  MessageSender,
  MessageStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma-service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { prismaErrorHandler } from 'src/common/utils/prisma-error.handler';
import { conversationPublicSelect } from './conversation.select';
import { messagePublicSelect } from 'src/messages/message.select';

@Injectable()
export class ConversationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: CreateConversationDto) {
    return prismaErrorHandler(() =>
      this.prismaService.conversation.create({
        data,
        select: conversationPublicSelect,
      }),
    );
  }

  async createWithFirstMessage(data: {
    userId: string;
    title: string;
    message: {
      sender: MessageSender;
      content: string;
      tokenCount: number;
      status?: MessageStatus;
    };
  }) {
    return prismaErrorHandler(() =>
      this.prismaService.$transaction(async (tx) => {
        const conversation = await tx.conversation.create({
          data: {
            userId: data.userId,
            title: data.title,
          },
          select: conversationPublicSelect,
        });

        const message = await tx.message.create({
          data: {
            conversationId: conversation.id,
            sender: data.message.sender,
            content: data.message.content,
            tokenCount: data.message.tokenCount,
            status: data.message.status,
          },
          select: messagePublicSelect,
        });

        return {
          conversation,
          message,
        };
      }),
    );
  }

  async findById(id: string) {
    const conversation = await prismaErrorHandler(() =>
      this.prismaService.conversation.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        select: conversationPublicSelect,
      }),
    );

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async update(id: string, data: UpdateConversationDto) {
    await this.findById(id);

    return prismaErrorHandler(() =>
      this.prismaService.conversation.update({
        where: { id },
        data,
        select: conversationPublicSelect,
      }),
    );
  }

  async getAll() {
    return prismaErrorHandler(() =>
      this.prismaService.conversation.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: conversationPublicSelect,
      }),
    );
  }

  async getConversationsPage(cursor?: string, take = 50) {
    const pageSize = Math.min(Math.max(take, 1), 100);

    const conversations = await prismaErrorHandler(() =>
      this.prismaService.conversation.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pageSize + 1,
        select: conversationPublicSelect,
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

    const hasNextPage = conversations.length > pageSize;
    const data = hasNextPage ? conversations.slice(0, pageSize) : conversations;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      data,
      nextCursor,
    };
  }

  async getUserConversationsPage(userId: string, cursor?: string, take = 50) {
    const pageSize = Math.min(Math.max(take, 1), 100);

    const conversations = await prismaErrorHandler(() =>
      this.prismaService.conversation.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pageSize + 1,
        select: conversationPublicSelect,
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

    const hasNextPage = conversations.length > pageSize;
    const data = hasNextPage ? conversations.slice(0, pageSize) : conversations;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      data,
      nextCursor,
    };
  }

  async delete(id: string) {
    await this.findById(id);

    return prismaErrorHandler(() =>
      this.prismaService.conversation.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: ConversationStatus.ARCHIVED,
        },
      }),
    );
  }
}
