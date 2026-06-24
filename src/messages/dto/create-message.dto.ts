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

export class CreateMessageDto {
  @IsUUID()
  conversationId: string;

  @IsEnum(MessageSender)
  sender: MessageSender;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(MessageStatus)
  @IsOptional()
  status?: MessageStatus;

  @IsInt()
  @Min(0)
  tokenCount: number;
}
