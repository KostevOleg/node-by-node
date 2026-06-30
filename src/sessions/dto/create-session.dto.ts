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

export class CreateSessionDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  refreshTokenHash: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsIP()
  @IsOptional()
  @MaxLength(45)
  ipAddress?: string;

  @IsEnum(SessionStatus)
  @IsOptional()
  status?: SessionStatus;

  @IsDateString()
  expiresAt: string;
}
