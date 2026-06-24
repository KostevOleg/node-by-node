import { Injectable, NotFoundException } from '@nestjs/common';
import { ConversationStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma-service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { prismaErrorHandler } from 'src/common/utils/prisma-error.handler';

@Injectable()
export class ConversationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: CreateConversationDto) {
    return prismaErrorHandler(() =>
      this.prismaService.conversation.create({
        data,
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
      }),
    );
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
