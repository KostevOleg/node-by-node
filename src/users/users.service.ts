import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma-service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { prismaErrorHandler } from 'src/common/utils/prisma-error.handler';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}
  async create(data: CreateUserDto) {
    return prismaErrorHandler(() =>
      this.prismaService.user.create({
        data,
      }),
    );
  }
  async findById(id: string) {
    const user = await prismaErrorHandler(() =>
      this.prismaService.user.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      }),
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
  async update(id: string, data: UpdateUserDto) {
    await this.findById(id);

    return prismaErrorHandler(() =>
      this.prismaService.user.update({
        data,
        where: { id },
      }),
    );
  }
  async getAll() {
    return prismaErrorHandler(() =>
      this.prismaService.user.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    );
  }

  async getUsersPage(cursor?: string, take = 50) {
    const pageSize = Math.min(Math.max(take, 1), 100);

    const users = await prismaErrorHandler(() =>
      this.prismaService.user.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: pageSize + 1,
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

    const hasNextPage = users.length > pageSize;
    const data = hasNextPage ? users.slice(0, pageSize) : users;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      data,
      nextCursor,
    };
  }

  async delete(id: string) {
    await this.findById(id);

    return prismaErrorHandler(() =>
      this.prismaService.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      }),
    );
  }

  async getOrganizationUsersPage(
    organizationId: string,
    cursor?: string,
    take = 50,
  ) {
    const pageSize = Math.min(Math.max(take, 1), 100);

    const users = await prismaErrorHandler(() =>
      this.prismaService.user.findMany({
        where: {
          organizationId,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: pageSize + 1,
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

    const hasNextPage = users.length > pageSize;
    const data = hasNextPage ? users.slice(0, pageSize) : users;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      data,
      nextCursor,
    };
  }
}
