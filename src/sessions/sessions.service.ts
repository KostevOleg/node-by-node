import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma-service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { prismaErrorHandler } from 'src/common/utils/prisma-error.handler';

@Injectable()
export class SessionsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: CreateSessionDto) {
    return prismaErrorHandler(() =>
      this.prismaService.session.create({
        data,
      }),
    );
  }

  async findById(id: string) {
    const session = await prismaErrorHandler(() =>
      this.prismaService.session.findUnique({
        where: { id },
      }),
    );

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async update(id: string, data: UpdateSessionDto) {
    await this.findById(id);

    return prismaErrorHandler(() =>
      this.prismaService.session.update({
        where: { id },
        data,
      }),
    );
  }

  async getAll() {
    return prismaErrorHandler(() =>
      this.prismaService.session.findMany({
        where: {
          status: SessionStatus.ACTIVE,
          revokedAt: null,
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
