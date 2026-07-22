import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class FileResponseDto {
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
}

export class FilePageResponseDto {
  @ApiProperty({ type: [FileResponseDto] })
  data: FileResponseDto[];

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  nextCursor: string | null;
}
