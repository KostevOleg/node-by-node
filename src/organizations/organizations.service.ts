import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationStatus, SessionStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma-service';
import { prismaErrorHandler } from '../common/utils/prisma-error.handler';
import { organizationPublicSelect } from './organization.select';
import { serialize } from 'src/common/utils/serialize';
import { OrganizationResponseDto } from './dto/organization-response.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prismaService: PrismaService) {}
  async create(data: CreateOrganizationDto) {
    const organization = await prismaErrorHandler(() =>
      this.prismaService.organization.create({
        data,
        select: organizationPublicSelect,
      }),
    );

    return serialize(OrganizationResponseDto, organization);
  }
  async update(id: string, data: UpdateOrganizationDto) {
    await this.findById(id);

    const organization = await prismaErrorHandler(() =>
      this.prismaService.organization.update({
        data,
        where: { id },
        select: organizationPublicSelect,
      }),
    );

    return serialize(OrganizationResponseDto, organization);
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

    return serialize(OrganizationResponseDto, organization);
  }

  async getAll() {
    const organizations = await prismaErrorHandler(() =>
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

    return serialize(OrganizationResponseDto, organizations);
  }
  async getOrganizationPage(limit = 50, offset = 0) {
    const pageSize = Math.min(Math.max(limit, 1), 100);
    const skip = Math.max(offset, 0);

    const organizations = await prismaErrorHandler(() =>
      this.prismaService.organization.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
        select: organizationPublicSelect,
      }),
    );

    return {
      data: serialize(OrganizationResponseDto, organizations),
      limit: pageSize,
      offset: skip,
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
          organization: serialize(OrganizationResponseDto, organization),
          users,
          sessions,
        };
      }),
    );
  }
}
