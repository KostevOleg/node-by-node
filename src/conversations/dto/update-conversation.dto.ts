import { ConversationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateConversationDto {
  @ApiPropertyOptional({ example: 'Support conversation' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ enum: ConversationStatus, example: 'ACTIVE' })
  @IsEnum(ConversationStatus)
  @IsOptional()
  status?: ConversationStatus;
}
