import { ApiProperty } from '@nestjs/swagger';
import { MessageSender, MessageStatus } from '@prisma/client';
import { Expose } from 'class-transformer';

export class MessageResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  conversationId: string;

  @ApiProperty({ enum: MessageSender, example: MessageSender.USER })
  @Expose()
  sender: MessageSender;

  @ApiProperty({ example: 'Hello, how can I help?' })
  @Expose()
  content: string;

  @ApiProperty({ enum: MessageStatus, example: MessageStatus.SENT })
  @Expose()
  status: MessageStatus;

  @ApiProperty({ example: 6, minimum: 0 })
  @Expose()
  tokenCount: number;

  @ApiProperty({ example: '2026-07-11T12:00:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-07-11T12:00:00.000Z' })
  @Expose()
  updatedAt: Date;
}

export class MessagePageResponseDto {
  @ApiProperty({ type: [MessageResponseDto] })
  data: MessageResponseDto[];

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  nextCursor: string | null;
}
