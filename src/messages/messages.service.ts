import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma-service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: CreateMessageDto) {
    return this.prismaService.message.create({
      data,
    });
  }

  async findById(id: string) {
    const message = await this.prismaService.message.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  async update(id: string, data: UpdateMessageDto) {
    await this.findById(id);

    return this.prismaService.message.update({
      where: { id },
      data,
    });
  }

  async getAll() {
    return this.prismaService.message.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);

    return this.prismaService.message.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
