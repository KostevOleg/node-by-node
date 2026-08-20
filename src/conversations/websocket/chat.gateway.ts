import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedUser } from 'src/auth/types/authenticated-request';
import { ConversationsService } from '../conversations.service';
import { ChatRealtimeService } from './chat-realtime.service';
import { ChatPresenceService } from './chat-presence.service';

type AuthenticatedSocket = Omit<Socket, 'data'> & {
  data: {
    user?: AuthenticatedUser;
  };
};

type ChatPayload = {
  chatId: string;
};

type TypingPayload = ChatPayload & {
  isTyping: boolean;
};

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: '*',
  },
  pingInterval: 25000,
  pingTimeout: 20000,
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly authService: AuthService,
    private readonly conversationsService: ConversationsService,
    private readonly chatRealtimeService: ChatRealtimeService,
    private readonly chatPresenceService: ChatPresenceService,
  ) {}

  afterInit(server: Server) {
    this.chatRealtimeService.bindServer(server);
  }

  async handleConnection(client: AuthenticatedSocket) {
    const token = this.getHandshakeToken(client);

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const user = await this.authService.authenticateAccessToken(token);
      client.data.user = user;
      await client.join(this.chatRealtimeService.userRoom(user.id));
      await client.join(
        this.chatRealtimeService.organizationRoom(user.organizationId),
      );
      const { becameOnline } = this.chatPresenceService.trackConnection(
        user,
        client.id,
      );
      if (becameOnline) {
        this.chatRealtimeService.broadcastUserOnline(
          user.id,
          user.organizationId,
        );
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data.user;

    if (!user) {
      return;
    }
    const { becameOffline } = this.chatPresenceService.untrackConnection(
      user,
      client.id,
    );

    if (becameOffline) {
      this.chatRealtimeService.broadcastUserOffline(
        user.id,
        user.organizationId,
      );
    }
  }

  @SubscribeMessage('joinChat')
  async joinChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: ChatPayload,
  ) {
    const user = this.getSocketUser(client);
    const chatId = this.getChatId(body);

    const participantIds =
      await this.conversationsService.getAccessibleChatParticipantIds(
        user,
        chatId,
      );

    const room = this.chatRealtimeService.chatRoom(chatId);
    const wasAlreadyInRoom = client.rooms?.has(room) ?? false;

    await client.join(room);

    if (!wasAlreadyInRoom) {
      this.chatRealtimeService.broadcastUserJoinedChat(chatId, user.id);
    }

    return {
      ok: true,
      chatId,
      onlineUserIds: this.chatPresenceService.getOnlineUserIds(participantIds),
    };
  }

  @SubscribeMessage('leaveChat')
  async leaveChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: ChatPayload,
  ) {
    const user = this.getSocketUser(client);
    const chatId = this.getChatId(body);

    await this.conversationsService.assertCanAccessChat(user, chatId);
    await client.leave(this.chatRealtimeService.chatRoom(chatId));
    this.chatRealtimeService.broadcastUserLeftChat(chatId, user.id);

    return { ok: true, chatId };
  }

  @SubscribeMessage('typing')
  async typing(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: TypingPayload,
  ) {
    const user = this.getSocketUser(client);
    const chatId = this.getChatId(body);

    if (typeof body?.isTyping !== 'boolean') {
      throw new WsException('isTyping must be boolean');
    }

    await this.conversationsService.assertCanAccessChat(user, chatId);
    this.chatRealtimeService.broadcastUserTyping(
      chatId,
      user.id,
      body.isTyping,
    );

    return { ok: true };
  }

  @SubscribeMessage('ping')
  ping() {
    return {
      event: 'pong',
      data: {
        at: new Date().toISOString(),
      },
    };
  }

  private getSocketUser(client: AuthenticatedSocket) {
    const user = client.data.user;

    if (!user) {
      throw new WsException('Unauthorized');
    }

    return user;
  }

  private getHandshakeToken(client: AuthenticatedSocket) {
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    const token = auth?.token;

    return typeof token === 'string' ? token : null;
  }

  private getChatId(body: ChatPayload) {
    if (!body?.chatId || typeof body.chatId !== 'string') {
      throw new WsException('chatId is required');
    }

    return body.chatId;
  }
}
