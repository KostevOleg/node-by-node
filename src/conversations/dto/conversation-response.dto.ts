import { ConversationStatus } from '@prisma/client';
import { Expose } from 'class-transformer';

export class ConversationResponseDto {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  title: string;

  @Expose()
  status: ConversationStatus;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
