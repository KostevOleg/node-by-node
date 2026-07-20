import { ApiProperty } from '@nestjs/swagger';
import { OrganizationStatus } from '@prisma/client';
import { Expose } from 'class-transformer';

export class OrganizationResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'Acme Inc.' })
  @Expose()
  name: string;

  @ApiProperty({ example: 'acme' })
  @Expose()
  slug: string;

  @ApiProperty({ example: 'AI workspace for Acme Inc.', nullable: true })
  @Expose()
  description: string | null;

  @ApiProperty({ enum: OrganizationStatus, example: OrganizationStatus.ACTIVE })
  @Expose()
  status: OrganizationStatus;

  @ApiProperty({ example: '2026-07-11T12:00:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-07-11T12:00:00.000Z' })
  @Expose()
  updatedAt: Date;
}

export class OrganizationPageResponseDto {
  @ApiProperty({ type: [OrganizationResponseDto] })
  data: OrganizationResponseDto[];

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: 0 })
  offset: number;
}
