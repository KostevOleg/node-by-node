import { ApiProperty } from '@nestjs/swagger';
import { ConversationStatus } from '@prisma/client';
import { Expose } from 'class-transformer';

export class ConversationResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  userId: string;

  @ApiProperty({ example: 'Support conversation' })
  @Expose()
  title: string;

  @ApiProperty({
    enum: ConversationStatus,
    example: ConversationStatus.ACTIVE,
  })
  @Expose()
  status: ConversationStatus;

  @ApiProperty({ example: '2026-07-11T12:00:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-07-11T12:00:00.000Z' })
  @Expose()
  updatedAt: Date;
}

export class ConversationPageResponseDto {
  @ApiProperty({ type: [ConversationResponseDto] })
  data: ConversationResponseDto[];

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  nextCursor: string | null;
}
