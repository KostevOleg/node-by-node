import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { ChatMessageObject, ChatObject } from '../graphql/chat.types';

@Injectable()
export class ChatRealtimeService {
  private server: Server | null = null;

  bindServer(server: Server) {
    this.server = server;
  }

  broadcastMessageCreated(message: ChatMessageObject) {
    this.server
      ?.to(this.chatRoom(message.chatId))
      .emit('messageCreated', message);
  }

  broadcastMessageUpdated(message: ChatMessageObject) {
    this.server
      ?.to(this.chatRoom(message.chatId))
      .emit('messageUpdated', message);
  }

  broadcastMessageDeleted(message: ChatMessageObject) {
    this.server
      ?.to(this.chatRoom(message.chatId))
      .emit('messageDeleted', message);
  }

  broadcastUserJoinedChat(chatId: string, userId: string) {
    this.server
      ?.to(this.chatRoom(chatId))
      .emit('userJoinedChat', { chatId, userId });
  }

  broadcastUserLeftChat(chatId: string, userId: string) {
    this.server
      ?.to(this.chatRoom(chatId))
      .emit('userLeftChat', { chatId, userId });
  }

  broadcastUserTyping(chatId: string, userId: string, isTyping: boolean) {
    this.server
      ?.to(this.chatRoom(chatId))
      .emit('userTyping', { chatId, userId, isTyping });
  }

  broadcastUserOnline(userId: string, organizationId: string) {
    this.server
      ?.to(this.organizationRoom(organizationId))
      .emit('userOnline', { userId, organizationId });
  }

  broadcastUserOffline(userId: string, organizationId: string) {
    this.server
      ?.to(this.organizationRoom(organizationId))
      .emit('userOffline', { userId, organizationId });
  }

  chatRoom(chatId: string) {
    return `chat:${chatId}`;
  }

  organizationRoom(organizationId: string) {
    return `organization:${organizationId}`;
  }

  userRoom(userId: string) {
    return `user:${userId}`;
  }
  broadcastChatCreated(chat: ChatObject) {
    for (const participant of chat.participants) {
      this.server
        ?.to(this.userRoom(participant.userId))
        .emit('chatCreated', chat);
    }
  }
  broadcastChatMessageCreated(
    message: ChatMessageObject,
    participantIds: string[],
  ) {
    for (const userId of participantIds) {
      this.server?.to(this.userRoom(userId)).emit('chatMessageCreated', {
        chatId: message.chatId,
        message,
      });
    }
  }
  broadcastChatDeleted(chatId: string, participantIds: string[]) {
    for (const userId of participantIds) {
      this.server?.to(this.userRoom(userId)).emit('chatDeleted', { chatId });
    }
  }
}
