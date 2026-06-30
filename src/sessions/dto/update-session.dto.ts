import {
  IsDateString,
  IsEnum,
  IsIP,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { SessionStatus } from '@prisma/client';

export class UpdateSessionDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  refreshTokenHash?: string;

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
  @IsOptional()
  expiresAt?: string;
}
