import { MessageSender, MessageStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  conversationId: string;

  @ApiProperty({ enum: MessageSender, example: 'USER' })
  @IsEnum(MessageSender)
  sender: MessageSender;

  @ApiProperty({ example: 'Hello, how can I help?' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ enum: MessageStatus, example: 'SENT' })
  @IsEnum(MessageStatus)
  @IsOptional()
  status?: MessageStatus;

  @ApiProperty({ example: 6, minimum: 0 })
  @IsInt()
  @Min(0)
  tokenCount: number;
}
