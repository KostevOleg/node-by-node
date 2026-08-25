import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlAccessTokenGuard } from 'src/auth/graphql-access-token.guard';
import type { AuthenticatedUser } from 'src/auth/types/authenticated-request';
import {
  ChatMessageObject,
  ChatMessagePageObject,
  ChatObject,
  ChatPageObject,
} from './chat.types';
import {
  ChatMessagesInput,
  ChatPageInput,
  CreateChatInput,
  SendMessageInput,
  UpdateMessageInput,
} from './chat.inputs';
import { ConversationsService } from '../conversations.service';
import { GqlCurrentUser } from 'src/auth/decorators/gql-current-user.decorator';

@Resolver(() => ChatObject)
@UseGuards(GraphqlAccessTokenGuard)
export class ConversationsResolver {
  constructor(private readonly conversationsService: ConversationsService) {}
  @Query(() => ChatPageObject)
  myChats(
    @GqlCurrentUser() user: AuthenticatedUser,
    @Args('input', { nullable: true }) input?: ChatPageInput,
  ) {
    return this.conversationsService.getMyChats(user, input);
  }

  @Query(() => ChatMessagePageObject)
  chatMessages(
    @GqlCurrentUser() user: AuthenticatedUser,
    @Args('input') input: ChatMessagesInput,
  ) {
    return this.conversationsService.getChatMessages(user, input);
  }

  @Mutation(() => ChatObject)
  createChat(
    @GqlCurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateChatInput,
  ) {
    return this.conversationsService.createChat(user, input);
  }

  @Mutation(() => ChatMessageObject)
  sendMessage(
    @GqlCurrentUser() user: AuthenticatedUser,
    @Args('input') input: SendMessageInput,
  ) {
    return this.conversationsService.sendMessage(user, input);
  }

  @Mutation(() => ChatMessageObject)
  deleteMessage(
    @GqlCurrentUser() user: AuthenticatedUser,
    @Args('messageId', { type: () => ID }) messageId: string,
  ) {
    return this.conversationsService.deleteMessage(user, messageId);
  }

  @Mutation(() => ChatMessageObject)
  updateMessage(
    @GqlCurrentUser() user: AuthenticatedUser,
    @Args('input') input: UpdateMessageInput,
  ) {
    return this.conversationsService.updateMessage(user, input);
  }

  @Mutation(() => Boolean)
  deleteChat(
    @GqlCurrentUser() user: AuthenticatedUser,
    @Args('chatId', { type: () => ID }) chatId: string,
  ) {
    return this.conversationsService.deleteChat(user, chatId);
  }
}
