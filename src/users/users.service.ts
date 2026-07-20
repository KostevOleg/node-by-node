import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma-service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { prismaErrorHandler } from 'src/common/utils/prisma-error.handler';
import { userPublicSelect } from './user.select';
import { serialize } from 'src/common/utils/serialize';
import { UserResponseDto } from './dto/user-response.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}
  async create(data: CreateUserDto) {
    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prismaErrorHandler(() =>
      this.prismaService.user.create({
        data: {
          organizationId: data.organizationId,
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          status: data.status,
        },
        select: userPublicSelect,
      }),
    );

    return serialize(UserResponseDto, user);
  }
  async findById(id: string) {
    const user = await prismaErrorHandler(() =>
      this.prismaService.user.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        select: userPublicSelect,
      }),
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return serialize(UserResponseDto, user);
  }
  async update(id: string, data: UpdateUserDto) {
    await this.findById(id);
    const updateData = {
      organizationId: data.organizationId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      status: data.status,
      ...(data.password
        ? { passwordHash: await bcrypt.hash(data.password, 10) }
        : {}),
    };

    const user = await prismaErrorHandler(() =>
      this.prismaService.user.update({
        data: updateData,
        where: { id },
        select: userPublicSelect,
      }),
    );

    return serialize(UserResponseDto, user);
  }
  async getAll() {
    const users = await prismaErrorHandler(() =>
      this.prismaService.user.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: userPublicSelect,
      }),
    );

    return serialize(UserResponseDto, users);
  }

  async getUsersPage(limit = 50, offset = 0) {
    const pageSize = Math.min(Math.max(limit, 1), 100);
    const skip = Math.max(offset, 0);

    const users = await prismaErrorHandler(() =>
      this.prismaService.user.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
        select: userPublicSelect,
      }),
    );

    return {
      data: serialize(UserResponseDto, users),
      limit: pageSize,
      offset: skip,
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
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pageSize + 1,
        select: userPublicSelect,
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
      data: serialize(UserResponseDto, data),
      nextCursor,
    };
  }
  async findByEmail(email: string) {
    const user = await prismaErrorHandler(() =>
      this.prismaService.user.findFirst({
        where: {
          email,
          deletedAt: null,
        },
        select: userPublicSelect,
      }),
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return serialize(UserResponseDto, user);
  }
}
