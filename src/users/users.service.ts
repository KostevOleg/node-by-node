import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma-service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}
  async create(data: CreateUserDto) {
    return this.prismaService.user.create({
      data,
    });
  }
  async findById(id: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
  async update(id: string, data: UpdateUserDto) {
    await this.findById(id);

    return this.prismaService.user.update({
      data,
      where: { id },
    });
  }
  async getAll() {
    return this.prismaService.user.findMany({
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

    return this.prismaService.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
