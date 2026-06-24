import { NotFoundException } from '@nestjs/common';
import { OrganizationStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from 'src/prisma/prisma-service';
import { OrganizationsService } from './organizations.service';

const prismaService = {
  organization: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  const organization = {
    id: 'organization-id',
    name: 'Acme',
    slug: 'acme',
    description: null,
    status: OrganizationStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrganizationsService(
      prismaService as unknown as PrismaService,
    );
  });

  it('should create an organization', async () => {
    const data = {
      name: 'Acme',
      slug: 'acme',
    };

    prismaService.organization.create.mockResolvedValue(organization);

    await expect(service.create(data)).resolves.toEqual(organization);
    expect(prismaService.organization.create).toHaveBeenCalledWith({ data });
  });

  it('should find an organization by id', async () => {
    prismaService.organization.findFirst.mockResolvedValue(organization);

    await expect(service.findById('organization-id')).resolves.toEqual(
      organization,
    );
    expect(prismaService.organization.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'organization-id',
        deletedAt: null,
      },
    });
  });

  it('should throw NotFoundException when organization is not found', async () => {
    prismaService.organization.findFirst.mockResolvedValue(null);

    await expect(service.findById('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should get all organizations', async () => {
    prismaService.organization.findMany.mockResolvedValue([organization]);

    await expect(service.getAll()).resolves.toEqual([organization]);
    expect(prismaService.organization.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  });

  it('should update an organization', async () => {
    const data = {
      name: 'Updated Acme',
    };

    const updatedOrganization = {
      ...organization,
      ...data,
    };

    prismaService.organization.findFirst.mockResolvedValue(organization);
    prismaService.organization.update.mockResolvedValue(updatedOrganization);

    await expect(service.update('organization-id', data)).resolves.toEqual(
      updatedOrganization,
    );
    expect(prismaService.organization.update).toHaveBeenCalledWith({
      data,
      where: { id: 'organization-id' },
    });
  });

  it('should soft delete an organization', async () => {
    const deletedOrganization = {
      ...organization,
      status: OrganizationStatus.ARCHIVED,
      deletedAt: new Date(),
    };

    prismaService.organization.findFirst.mockResolvedValue(organization);
    prismaService.organization.update.mockResolvedValue(deletedOrganization);

    await expect(service.delete('organization-id')).resolves.toEqual(
      deletedOrganization,
    );
    expect(prismaService.organization.update).toHaveBeenCalledWith({
      where: { id: 'organization-id' },
      data: {
        deletedAt: expect.any(Date) as unknown as Date,
        status: OrganizationStatus.ARCHIVED,
      },
    });
  });
});
