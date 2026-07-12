import { OrganizationStatus } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Inc.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'acme' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  slug: string;

  @ApiPropertyOptional({ example: 'AI workspace for Acme Inc.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: OrganizationStatus, example: 'ACTIVE' })
  @IsEnum(OrganizationStatus)
  @IsOptional()
  status?: OrganizationStatus;
}
