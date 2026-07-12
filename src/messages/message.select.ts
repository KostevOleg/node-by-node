import { Prisma } from '@prisma/client';

export const messagePublicSelect = {
  id: true,
  conversationId: true,
  sender: true,
  content: true,
  status: true,
  tokenCount: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MessageSelect;
