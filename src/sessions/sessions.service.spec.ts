import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma-service';
import { SessionsService } from './sessions.service';

const prismaService = {
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

describe('SessionsService', () => {
  let service: SessionsService;

  const session = {
    id: 'session-id',
    userId: 'user-id',
    refreshTokenHash: 'refresh-token-hash',
    userAgent: 'Mozilla/5.0',
    ipAddress: '127.0.0.1',
    status: SessionStatus.ACTIVE,
    expiresAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    revokedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SessionsService(prismaService as unknown as PrismaService);
  });

  it('should create a session', async () => {
    const data = {
      userId: 'user-id',
      refreshTokenHash: 'refresh-token-hash',
      userAgent: 'Mozilla/5.0',
      ipAddress: '127.0.0.1',
      expiresAt: '2026-01-01T00:00:00.000Z',
    };

    prismaService.session.create.mockResolvedValue(session);

    await expect(service.create(data)).resolves.toEqual(session);
    expect(prismaService.session.create).toHaveBeenCalledWith({ data });
  });

  it('should find a session by id', async () => {
    prismaService.session.findUnique.mockResolvedValue(session);

    await expect(service.findById('session-id')).resolves.toEqual(session);
    expect(prismaService.session.findUnique).toHaveBeenCalledWith({
      where: { id: 'session-id' },
    });
  });

  it('should throw NotFoundException when session is not found', async () => {
    prismaService.session.findUnique.mockResolvedValue(null);

    await expect(service.findById('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should get all sessions', async () => {
    prismaService.session.findMany.mockResolvedValue([session]);

    await expect(service.getAll()).resolves.toEqual([session]);
    expect(prismaService.session.findMany).toHaveBeenCalledWith({
      orderBy: {
        createdAt: 'desc',
      },
    });
  });

  it('should update a session', async () => {
    const data = {
      status: SessionStatus.EXPIRED,
    };
    const updatedSession = {
      ...session,
      ...data,
    };

    prismaService.session.findUnique.mockResolvedValue(session);
    prismaService.session.update.mockResolvedValue(updatedSession);

    await expect(service.update('session-id', data)).resolves.toEqual(
      updatedSession,
    );
    expect(prismaService.session.update).toHaveBeenCalledWith({
      where: { id: 'session-id' },
      data,
    });
  });

  it('should revoke a session', async () => {
    const revokedSession = {
      ...session,
      status: SessionStatus.REVOKED,
      revokedAt: new Date(),
    };

    prismaService.session.findUnique.mockResolvedValue(session);
    prismaService.session.update.mockResolvedValue(revokedSession);

    await expect(service.delete('session-id')).resolves.toEqual(revokedSession);
    expect(prismaService.session.update).toHaveBeenCalledWith({
      where: { id: 'session-id' },
      data: {
        status: SessionStatus.REVOKED,
        revokedAt: expect.any(Date) as Date,
      },
    });
  });
});
