import { ApiProperty } from '@nestjs/swagger';
import { SessionStatus } from '@prisma/client';
import { Expose } from 'class-transformer';

export class SessionResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  userId: string;

  @ApiProperty({ example: 'Mozilla/5.0', nullable: true })
  @Expose()
  userAgent: string | null;

  @ApiProperty({ example: '127.0.0.1', nullable: true })
  @Expose()
  ipAddress: string | null;

  @ApiProperty({ enum: SessionStatus, example: SessionStatus.ACTIVE })
  @Expose()
  status: SessionStatus;

  @ApiProperty({ example: '2026-07-16T12:00:00.000Z' })
  @Expose()
  expiresAt: Date;

  @ApiProperty({ example: '2026-07-11T12:00:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-07-11T12:00:00.000Z' })
  @Expose()
  updatedAt: Date;

  @ApiProperty({ example: '2026-07-12T12:00:00.000Z', nullable: true })
  @Expose()
  revokedAt: Date | null;
}

export class SessionPageResponseDto {
  @ApiProperty({ type: [SessionResponseDto] })
  data: SessionResponseDto[];

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  nextCursor: string | null;
}
