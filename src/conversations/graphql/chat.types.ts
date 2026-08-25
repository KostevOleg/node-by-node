import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ChatParticipantObject {
  @Field(() => ID)
  userId: string;

  @Field()
  email: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;
}

@ObjectType()
export class ChatMessageObject {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  chatId: string;

  @Field(() => ID, { nullable: true })
  senderId: string | null;

  @Field()
  content: string;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

@ObjectType()
export class ChatObject {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  organizationId: string;

  @Field()
  status: string;

  @Field(() => [ChatParticipantObject])
  participants: ChatParticipantObject[];

  @Field(() => ChatMessageObject, { nullable: true })
  lastMessage: ChatMessageObject | null;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

@ObjectType()
export class ChatPageObject {
  @Field(() => [ChatObject])
  data: ChatObject[];

  @Field(() => ID, { nullable: true })
  nextCursor: string | null;
}

@ObjectType()
export class ChatMessagePageObject {
  @Field(() => [ChatMessageObject])
  data: ChatMessageObject[];

  @Field(() => ID, { nullable: true })
  nextCursor: string | null;
}
