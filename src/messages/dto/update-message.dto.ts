import { MessageSender, MessageStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class UpdateMessageDto {
  @IsUUID()
  @IsOptional()
  conversationId?: string;

  @IsEnum(MessageSender)
  @IsOptional()
  sender?: MessageSender;

  @IsString()
  @IsOptional()
  content?: string;

  @IsEnum(MessageStatus)
  @IsOptional()
  status?: MessageStatus;

  @IsInt()
  @IsOptional()
  @Min(0)
  tokenCount?: number;
}
