import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma-service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { prismaErrorHandler } from 'src/common/utils/prisma-error.handler';
import { sessionPublicSelect } from './session.select';
import { serialize } from 'src/common/utils/serialize';
import { SessionResponseDto } from './dto/session-response.dto';

@Injectable()
export class SessionsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: CreateSessionDto) {
    const session = await prismaErrorHandler(() =>
      this.prismaService.session.create({
        data,
        select: sessionPublicSelect,
      }),
    );

    return serialize(SessionResponseDto, session);
  }

  async findById(id: string) {
    const session = await prismaErrorHandler(() =>
      this.prismaService.session.findUnique({
        where: { id },
        select: sessionPublicSelect,
      }),
    );

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return serialize(SessionResponseDto, session);
  }

  async getSessionsPage(cursor?: string, take = 50) {
    const pageSize = Math.min(Math.max(take, 1), 100);

    const sessions = await prismaErrorHandler(() =>
      this.prismaService.session.findMany({
        where: {
          status: SessionStatus.ACTIVE,
          revokedAt: null,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pageSize + 1,
        select: sessionPublicSelect,
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

    const hasNextPage = sessions.length > pageSize;
    const data = hasNextPage ? sessions.slice(0, pageSize) : sessions;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      data: serialize(SessionResponseDto, data),
      nextCursor,
    };
  }

  async update(id: string, data: UpdateSessionDto) {
    await this.findById(id);

    const session = await prismaErrorHandler(() =>
      this.prismaService.session.update({
        where: { id },
        data,
        select: sessionPublicSelect,
      }),
    );

    return serialize(SessionResponseDto, session);
  }

  async getAll() {
    const sessions = await prismaErrorHandler(() =>
      this.prismaService.session.findMany({
        where: {
          status: SessionStatus.ACTIVE,
          revokedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: sessionPublicSelect,
      }),
    );

    return serialize(SessionResponseDto, sessions);
  }

  async delete(id: string) {
    await this.findById(id);

    return prismaErrorHandler(() =>
      this.prismaService.session.update({
        where: { id },
        data: {
          status: SessionStatus.REVOKED,
          revokedAt: new Date(),
        },
      }),
    );
  }
}
