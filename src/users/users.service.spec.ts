import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma-service';
import { UsersService } from './users.service';
import { userPublicSelect } from './user.select';

const prismaService = {
  user: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  const user = {
    id: 'user-id',
    organizationId: 'organization-id',
    email: 'user@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Alex',
    lastName: 'Smith',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(prismaService as unknown as PrismaService);
  });

  it('should create a user', async () => {
    const data = {
      organizationId: 'organization-id',
      email: 'user@example.com',
      passwordHash: 'hashed-password',
      firstName: 'Alex',
      lastName: 'Smith',
      status: 'ACTIVE',
    };

    prismaService.user.create.mockResolvedValue(user);

    await expect(service.create(data)).resolves.toEqual(user);
    expect(prismaService.user.create).toHaveBeenCalledWith({
      data,
      select: userPublicSelect,
    });
  });

  it('should find a user by id', async () => {
    prismaService.user.findFirst.mockResolvedValue(user);

    await expect(service.findById('user-id')).resolves.toEqual(user);
    expect(prismaService.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'user-id',
        deletedAt: null,
      },
      select: userPublicSelect,
    });
  });

  it('should throw NotFoundException when user is not found', async () => {
    prismaService.user.findFirst.mockResolvedValue(null);

    await expect(service.findById('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should get all users', async () => {
    prismaService.user.findMany.mockResolvedValue([user]);

    await expect(service.getAll()).resolves.toEqual([user]);
    expect(prismaService.user.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: userPublicSelect,
    });
  });

  it('should get a users page', async () => {
    const secondUser = {
      ...user,
      id: 'second-user-id',
      email: 'second@example.com',
    };

    prismaService.user.findMany.mockResolvedValue([user, secondUser]);

    await expect(service.getUsersPage(undefined, 1)).resolves.toEqual({
      data: [user],
      nextCursor: 'user-id',
    });
    expect(prismaService.user.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 2,
      select: userPublicSelect,
    });
  });

  it('should get an organization users page with cursor', async () => {
    prismaService.user.findMany.mockResolvedValue([user]);

    await expect(
      service.getOrganizationUsersPage('organization-id', 'cursor-id', 10),
    ).resolves.toEqual({
      data: [user],
      nextCursor: null,
    });
    expect(prismaService.user.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'organization-id',
        deletedAt: null,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 11,
      select: userPublicSelect,
      cursor: {
        id: 'cursor-id',
      },
      skip: 1,
    });
  });

  it('should update a user', async () => {
    const data = {
      firstName: 'Updated',
    };
    const updatedUser = {
      ...user,
      ...data,
    };

    prismaService.user.findFirst.mockResolvedValue(user);
    prismaService.user.update.mockResolvedValue(updatedUser);

    await expect(service.update('user-id', data)).resolves.toEqual(updatedUser);
    expect(prismaService.user.update).toHaveBeenCalledWith({
      data,
      where: { id: 'user-id' },
      select: userPublicSelect,
    });
  });

  it('should soft delete a user', async () => {
    const deletedUser = {
      ...user,
      deletedAt: new Date(),
    };

    prismaService.user.findFirst.mockResolvedValue(user);
    prismaService.user.update.mockResolvedValue(deletedUser);

    await expect(service.delete('user-id')).resolves.toEqual(deletedUser);
    expect(prismaService.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: {
        deletedAt: expect.any(Date) as Date,
      },
    });
  });
  it('should find a user by email', async () => {
    prismaService.user.findFirst.mockResolvedValue(user);

    await expect(service.findByEmail('user@example.com')).resolves.toEqual(
      user,
    );
    expect(prismaService.user.findFirst).toHaveBeenCalledWith({
      where: {
        email: 'user@example.com',
        deletedAt: null,
      },
      select: userPublicSelect,
    });
  });

  it('should throw NotFoundException when user is not found by email', async () => {
    prismaService.user.findFirst.mockResolvedValue(null);

    await expect(service.findByEmail('missing@example.com')).rejects.toThrow(
      NotFoundException,
    );
  });
});
