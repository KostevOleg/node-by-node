import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import { Expose } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  organizationId: string;

  @ApiProperty({ example: 'user@example.com' })
  @Expose()
  email: string;

  @ApiProperty({ example: 'Jane' })
  @Expose()
  firstName: string;

  @ApiProperty({ example: 'Malcovich' })
  @Expose()
  lastName: string;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  @Expose()
  status: UserStatus;

  @ApiProperty({ example: '2026-07-11T12:00:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-07-11T12:00:00.000Z' })
  @Expose()
  updatedAt: Date;
}

export class UserPageResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data: UserResponseDto[];

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  nextCursor: string | null;
}
