import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileProcessingStatus } from '@prisma/client';

export class RagIngestionStatusResponseDto {
  @ApiProperty()
  fileId: string;

  @ApiProperty({ enum: FileProcessingStatus })
  status: FileProcessingStatus;

  @ApiPropertyOptional({ nullable: true })
  chunksCount?: number | null;

  @ApiPropertyOptional({ nullable: true })
  startedAt?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  completedAt?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  failedAt?: Date | null;

  @ApiPropertyOptional()
  errorMessage?: string | null;
}
