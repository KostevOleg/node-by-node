import { MessageSender, MessageStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMessageDto {
  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsOptional()
  conversationId?: string;

  @ApiPropertyOptional({ enum: MessageSender, example: 'USER' })
  @IsEnum(MessageSender)
  @IsOptional()
  sender?: MessageSender;

  @ApiPropertyOptional({ example: 'Hello, how can I help?' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ enum: MessageStatus, example: 'SENT' })
  @IsEnum(MessageStatus)
  @IsOptional()
  status?: MessageStatus;

  @ApiPropertyOptional({ example: 6, minimum: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  tokenCount?: number;
}
