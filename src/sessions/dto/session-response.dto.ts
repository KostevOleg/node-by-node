import { SessionStatus } from '@prisma/client';
import { Expose } from 'class-transformer';

export class SessionResponseDto {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  userAgent: string | null;

  @Expose()
  ipAddress: string | null;

  @Expose()
  status: SessionStatus;

  @Expose()
  expiresAt: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  revokedAt: Date | null;
}
