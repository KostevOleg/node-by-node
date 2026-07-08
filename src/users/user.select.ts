import { Prisma } from '@prisma/client';

export const userPublicSelect = {
  id: true,
  organizationId: true,
  email: true,
  firstName: true,
  lastName: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;
