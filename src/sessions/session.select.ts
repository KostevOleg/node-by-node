import { Prisma } from '@prisma/client';

export const sessionPublicSelect = {
  id: true,
  userId: true,
  userAgent: true,
  ipAddress: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  revokedAt: true,
} satisfies Prisma.SessionSelect;
