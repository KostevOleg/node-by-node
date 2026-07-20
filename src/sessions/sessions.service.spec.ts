import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma-service';
import { SessionsService } from './sessions.service';
import { sessionPublicSelect } from './session.select';

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

  const publicSession = {
    id: session.id,
    userId: session.userId,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    status: session.status,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    revokedAt: session.revokedAt,
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

    await expect(service.create(data)).resolves.toMatchObject(publicSession);
    expect(prismaService.session.create).toHaveBeenCalledWith({
      data,
      select: sessionPublicSelect,
    });
  });

  it('should find a session by id', async () => {
    prismaService.session.findUnique.mockResolvedValue(session);

    await expect(service.findById('session-id')).resolves.toMatchObject(
      publicSession,
    );
    expect(prismaService.session.findUnique).toHaveBeenCalledWith({
      where: { id: 'session-id' },
      select: sessionPublicSelect,
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

    await expect(service.getAll()).resolves.toMatchObject([publicSession]);
    expect(prismaService.session.findMany).toHaveBeenCalledWith({
      where: {
        status: SessionStatus.ACTIVE,
        revokedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: sessionPublicSelect,
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

    await expect(service.update('session-id', data)).resolves.toMatchObject({
      ...publicSession,
      ...data,
    });
    expect(prismaService.session.update).toHaveBeenCalledWith({
      where: { id: 'session-id' },
      data,
      select: sessionPublicSelect,
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
