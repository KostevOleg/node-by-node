import { Injectable } from '@nestjs/common';
import { ConversationStatus } from '@prisma/client';
import {
  ChatMessageObject,
  ChatObject,
  ChatParticipantObject,
} from '../graphql/chat.types';

type ChatParticipantSource = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
};

type ChatMessageSource = {
  id: string;
  conversationId: string;
  senderId: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

type ChatSource = {
  id: string;
  organizationId: string;
  status: ConversationStatus;
  createdAt: Date;
  updatedAt: Date;
  participants: ChatParticipantSource[];
  messages: ChatMessageSource[];
};

@Injectable()
export class ChatMapper {
  toChatObject(chat: ChatSource): ChatObject {
    return {
      id: chat.id,
      organizationId: chat.organizationId,
      status: chat.status,
      participants: chat.participants.map((participant) =>
        this.toChatParticipantObject(participant),
      ),
      lastMessage: chat.messages[0]
        ? this.toChatMessageObject(chat.messages[0])
        : null,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  }

  toChatMessageObject(message: ChatMessageSource): ChatMessageObject {
    return {
      id: message.id,
      chatId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  private toChatParticipantObject(
    participant: ChatParticipantSource,
  ): ChatParticipantObject {
    return {
      userId: participant.user.id,
      email: participant.user.email,
      firstName: participant.user.firstName,
      lastName: participant.user.lastName,
    };
  }
}
