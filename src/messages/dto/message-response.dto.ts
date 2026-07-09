import { MessageSender, MessageStatus } from '@prisma/client';
import { Expose } from 'class-transformer';

export class MessageResponseDto {
  @Expose()
  id: string;

  @Expose()
  conversationId: string;

  @Expose()
  sender: MessageSender;

  @Expose()
  content: string;

  @Expose()
  status: MessageStatus;

  @Expose()
  tokenCount: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
