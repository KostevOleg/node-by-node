import { OrganizationStatus } from '@prisma/client';
import { Expose } from 'class-transformer';

export class OrganizationResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  slug: string;

  @Expose()
  description: string | null;

  @Expose()
  status: OrganizationStatus;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
