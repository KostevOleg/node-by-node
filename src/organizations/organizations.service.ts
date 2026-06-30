import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma-service';
import { prismaErrorHandler } from '../common/utils/prisma-error.handler';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prismaService: PrismaService) {}
  async create(data: CreateOrganizationDto) {
    return prismaErrorHandler(() =>
      this.prismaService.organization.create({
        data,
      }),
    );
  }
  async update(id: string, data: UpdateOrganizationDto) {
    await this.findById(id);

    return prismaErrorHandler(() =>
      this.prismaService.organization.update({
        data,
        where: { id },
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
      }),
    );
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
}
