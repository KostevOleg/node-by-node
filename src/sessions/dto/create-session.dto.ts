import {
  IsDateString,
  IsEnum,
  IsIP,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { SessionStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'hashed-refresh-token-value' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  refreshTokenHash: string;

  @ApiPropertyOptional({ example: 'Mozilla/5.0' })
  @IsString()
  @IsOptional()
  userAgent?: string;

  @ApiPropertyOptional({ example: '127.0.0.1' })
  @IsIP()
  @IsOptional()
  @MaxLength(45)
  ipAddress?: string;

  @ApiPropertyOptional({ enum: SessionStatus, example: 'ACTIVE' })
  @IsEnum(SessionStatus)
  @IsOptional()
  status?: SessionStatus;

  @ApiProperty({ example: '2026-07-16T12:00:00.000Z' })
  @IsDateString()
  expiresAt: string;
}
