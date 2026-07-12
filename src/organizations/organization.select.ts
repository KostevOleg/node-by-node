import { Prisma } from '@prisma/client';

export const organizationPublicSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OrganizationSelect;
