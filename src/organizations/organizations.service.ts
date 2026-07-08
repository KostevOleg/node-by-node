import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationStatus, SessionStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma-service';
import { prismaErrorHandler } from '../common/utils/prisma-error.handler';
import { organizationPublicSelect } from './organization.select';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prismaService: PrismaService) {}
  async create(data: CreateOrganizationDto) {
    return prismaErrorHandler(() =>
      this.prismaService.organization.create({
        data,
        select: organizationPublicSelect,
      }),
    );
  }
  async update(id: string, data: UpdateOrganizationDto) {
    await this.findById(id);

    return prismaErrorHandler(() =>
      this.prismaService.organization.update({
        data,
        where: { id },
        select: organizationPublicSelect,
      }),
    );
  }

  async findById(id: string) {
    const organization = await prismaErrorHandler(() =>
      this.prismaService.organization.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        select: organizationPublicSelect,
      }),
    );

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async getAll() {
    return prismaErrorHandler(() =>
      this.prismaService.organization.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: organizationPublicSelect,
      }),
    );
  }
  async getOrganizationPage(cursor?: string, take = 50) {
    const pageSize = Math.min(Math.max(take, 1), 100);

    const organization = await prismaErrorHandler(() =>
      this.prismaService.organization.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pageSize + 1,
        select: organizationPublicSelect,
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

    const hasNextPage = organization.length > pageSize;
    const data = hasNextPage ? organization.slice(0, pageSize) : organization;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      data,
      nextCursor,
    };
  }

  async delete(id: string) {
    await this.findById(id);

    return prismaErrorHandler(() =>
      this.prismaService.organization.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: OrganizationStatus.ARCHIVED,
        },
      }),
    );
  }

  async deleteWithUsersAndSessions(id: string) {
    await this.findById(id);

    return prismaErrorHandler(() =>
      this.prismaService.$transaction(async (tx) => {
        const deletedAt = new Date();

        const sessions = await tx.session.updateMany({
          where: {
            user: {
              organizationId: id,
            },
            revokedAt: null,
          },
          data: {
            status: SessionStatus.REVOKED,
            revokedAt: deletedAt,
          },
        });

        const users = await tx.user.updateMany({
          where: {
            organizationId: id,
            deletedAt: null,
          },
          data: {
            deletedAt,
          },
        });

        const organization = await tx.organization.update({
          where: { id },
          data: {
            deletedAt,
            status: OrganizationStatus.ARCHIVED,
          },
          select: organizationPublicSelect,
        });

        return {
          organization,
          users,
          sessions,
        };
      }),
    );
  }
}
