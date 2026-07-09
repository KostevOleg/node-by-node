import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrganizationStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ example: 'Acme Inc.' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'acme' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional({ example: 'AI workspace for Acme Inc.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: OrganizationStatus, example: 'ACTIVE' })
  @IsEnum(OrganizationStatus)
  @IsOptional()
  status?: OrganizationStatus;
}
