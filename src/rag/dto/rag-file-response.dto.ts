import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileProcessingStatus } from '@prisma/client';
import { Expose } from 'class-transformer';

export class RagFileResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'report.pdf' })
  @Expose()
  originalName: string;

  @ApiProperty({ example: 'application/pdf' })
  @Expose()
  mimeType: string;

  @ApiProperty({ example: '.pdf' })
  @Expose()
  extension: string;

  @ApiProperty({ example: 1048576 })
  @Expose()
  size: number;

  @ApiProperty({ example: '2026-07-21T12:00:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ enum: FileProcessingStatus })
  @Expose()
  ragStatus: FileProcessingStatus;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  chunksCount?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  ragStartedAt?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  ragCompletedAt?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  ragFailedAt?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  ragErrorMessage?: string | null;
}

export class RagFilePageResponseDto {
  @ApiProperty({ type: [RagFileResponseDto] })
  data: RagFileResponseDto[];

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  nextCursor: string | null;
}
