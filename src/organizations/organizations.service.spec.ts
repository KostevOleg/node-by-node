import { NotFoundException } from '@nestjs/common';
import { OrganizationStatus, SessionStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from 'src/prisma/prisma-service';
import { OrganizationsService } from './organizations.service';
import { organizationPublicSelect } from './organization.select';

const prismaService = {
  $transaction: jest.fn(),
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

  const publicOrganization = {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description,
    status: organization.status,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
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

    await expect(service.create(data)).resolves.toMatchObject(
      publicOrganization,
    );
    expect(prismaService.organization.create).toHaveBeenCalledWith({
      data,
      select: organizationPublicSelect,
    });
  });

  it('should find an organization by id', async () => {
    prismaService.organization.findFirst.mockResolvedValue(organization);

    await expect(service.findById('organization-id')).resolves.toMatchObject(
      publicOrganization,
    );
    expect(prismaService.organization.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'organization-id',
        deletedAt: null,
      },
      select: organizationPublicSelect,
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

    await expect(service.getAll()).resolves.toMatchObject([
      publicOrganization,
    ]);
    expect(prismaService.organization.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: organizationPublicSelect,
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

    await expect(service.update('organization-id', data)).resolves.toMatchObject(
      {
        ...publicOrganization,
        ...data,
      },
    );
    expect(prismaService.organization.update).toHaveBeenCalledWith({
      data,
      where: { id: 'organization-id' },
      select: organizationPublicSelect,
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

  it('should delete an organization with users and sessions in a transaction', async () => {
    const deletedOrganization = {
      ...organization,
      status: OrganizationStatus.ARCHIVED,
      deletedAt: new Date(),
    };
    const tx = {
      session: {
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      user: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      organization: {
        update: jest.fn().mockResolvedValue(deletedOrganization),
      },
    };

    prismaService.organization.findFirst.mockResolvedValue(organization);
    prismaService.$transaction.mockImplementation((callback) => callback(tx));

    await expect(
      service.deleteWithUsersAndSessions('organization-id'),
    ).resolves.toEqual({
      organization: expect.objectContaining({
        ...publicOrganization,
        status: OrganizationStatus.ARCHIVED,
      }),
      users: { count: 2 },
      sessions: { count: 3 },
    });

    expect(prismaService.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
    );
    expect(tx.session.updateMany).toHaveBeenCalledWith({
      where: {
        user: {
          organizationId: 'organization-id',
        },
        revokedAt: null,
      },
      data: {
        status: SessionStatus.REVOKED,
        revokedAt: expect.any(Date),
      },
    });
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'organization-id',
        deletedAt: null,
      },
      data: {
        deletedAt: expect.any(Date),
      },
    });
    expect(tx.organization.update).toHaveBeenCalledWith({
      where: { id: 'organization-id' },
      data: {
        deletedAt: expect.any(Date),
        status: OrganizationStatus.ARCHIVED,
      },
      select: organizationPublicSelect,
    });
  });

  it('should fail the transaction when deleting related users fails', async () => {
    const error = new Error('User update failed');
    const tx = {
      session: {
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      user: {
        updateMany: jest.fn().mockRejectedValue(error),
      },
      organization: {
        update: jest.fn(),
      },
    };

    prismaService.organization.findFirst.mockResolvedValue(organization);
    prismaService.$transaction.mockImplementation((callback) => callback(tx));

    await expect(
      service.deleteWithUsersAndSessions('organization-id'),
    ).rejects.toThrow('Database error');

    expect(tx.session.updateMany).toHaveBeenCalled();
    expect(tx.user.updateMany).toHaveBeenCalled();
    expect(tx.organization.update).not.toHaveBeenCalled();
  });
});
