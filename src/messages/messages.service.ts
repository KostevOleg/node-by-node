import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma-service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { prismaErrorHandler } from 'src/common/utils/prisma-error.handler';
import { messagePublicSelect } from './message.select';
import { serialize } from 'src/common/utils/serialize';
import { MessageResponseDto } from './dto/message-response.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: CreateMessageDto) {
    const response = await prismaErrorHandler(() =>
      this.prismaService.message.create({
        data,
        select: messagePublicSelect,
      }),
    );
    return serialize(MessageResponseDto, response);
  }

  async findById(id: string) {
    const message = await prismaErrorHandler(() =>
      this.prismaService.message.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        select: messagePublicSelect,
      }),
    );

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return serialize(MessageResponseDto, message);
  }

  async update(id: string, data: UpdateMessageDto) {
    await this.findById(id);

    const response = await prismaErrorHandler(() =>
      this.prismaService.message.update({
        where: { id },
        data,
        select: messagePublicSelect,
      }),
    );

    return serialize(MessageResponseDto, response);
  }

  async getAll() {
    const response = await prismaErrorHandler(() =>
      this.prismaService.message.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: messagePublicSelect,
      }),
    );
    return serialize(MessageResponseDto, response);
  }

  async getMessagesPage(cursor?: string, take = 50) {
    const pageSize = Math.min(Math.max(take, 1), 100);

    const messages = await prismaErrorHandler(() =>
      this.prismaService.message.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pageSize + 1,
        select: messagePublicSelect,
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

    const hasNextPage = messages.length > pageSize;
    const data = hasNextPage ? messages.slice(0, pageSize) : messages;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      data: serialize(MessageResponseDto, data),
      nextCursor,
    };
  }

  async getConversationMessagesPage(
    conversationId: string,
    cursor?: string,
    take = 50,
  ) {
    const pageSize = Math.min(Math.max(take, 1), 100);

    const messages = await prismaErrorHandler(() =>
      this.prismaService.message.findMany({
        where: {
          conversationId,
          deletedAt: null,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: pageSize + 1,
        select: messagePublicSelect,
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

    const hasNextPage = messages.length > pageSize;
    const data = hasNextPage ? messages.slice(0, pageSize) : messages;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      data: serialize(MessageResponseDto, data),
      nextCursor,
    };
  }

  async delete(id: string) {
    await this.findById(id);

    return prismaErrorHandler(() =>
      this.prismaService.message.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      }),
    );
  }
}
