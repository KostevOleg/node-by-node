import { ConversationStatus } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateConversationDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsEnum(ConversationStatus)
  @IsOptional()
  status?: ConversationStatus;
}
