import { Prisma } from '@prisma/client';

export const conversationPublicSelect = {
  id: true,
  userId: true,
  title: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ConversationSelect;
