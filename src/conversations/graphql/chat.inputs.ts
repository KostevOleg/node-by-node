import { Field, ID, InputType, Int } from '@nestjs/graphql';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

@InputType()
export class CreateChatInput {
  @Field(() => ID)
  @IsUUID()
  participantId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  firstMessage: string;
}

@InputType()
export class ChatPageInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}

@InputType()
export class ChatMessagesInput {
  @Field(() => ID)
  @IsUUID()
  chatId: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}

@InputType()
export class SendMessageInput {
  @Field(() => ID)
  @IsUUID()
  chatId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  content: string;
}

@InputType()
export class UpdateMessageInput {
  @Field(() => ID)
  @IsUUID()
  messageId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  content: string;
}
