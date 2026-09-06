import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { isUUID } from 'class-validator';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedUser } from 'src/auth/types/authenticated-request';
import { RagRealtimeService } from './rag-realtime.service';
import { RagService } from '../rag.service';

type AuthenticatedSocket = Omit<Socket, 'data'> & {
  data: {
    user?: AuthenticatedUser;
  };
};

type RagFileStatusPayload = {
  fileId: string;
};

@WebSocketGateway({
  namespace: 'rag',
  cors: {
    origin: '*',
  },
  pingInterval: 25000,
  pingTimeout: 20000,
})
export class RagGateway implements OnGatewayInit, OnGatewayConnection {
  constructor(
    private readonly authService: AuthService,
    private readonly ragService: RagService,
    private readonly ragRealtimeService: RagRealtimeService,
  ) {}

  afterInit(server: Server): void {
    this.ragRealtimeService.bindServer(server);
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const token = this.getHandshakeToken(client);

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      client.data.user = await this.authService.authenticateAccessToken(token);
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('joinFileStatus')
  async joinFileStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: RagFileStatusPayload,
  ) {
    const user = this.getSocketUser(client);
    const fileId = this.getFileId(body);

    const status = await this.ragService.getIngestionStatus(user, fileId);
    await client.join(this.ragRealtimeService.ragFileRoom(fileId));

    return { ok: true, fileId, status };
  }

  @SubscribeMessage('leaveFileStatus')
  async leaveFileStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: RagFileStatusPayload,
  ) {
    const fileId = this.getFileId(body);

    await client.leave(this.ragRealtimeService.ragFileRoom(fileId));

    return { ok: true, fileId };
  }

  private getSocketUser(client: AuthenticatedSocket): AuthenticatedUser {
    const user = client.data.user;

    if (!user) {
      throw new WsException('Unauthorized');
    }

    return user;
  }

  private getHandshakeToken(client: AuthenticatedSocket): string | null {
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    const token = auth?.token;

    return typeof token === 'string' ? token : null;
  }

  private getFileId(body: RagFileStatusPayload): string {
    if (!body?.fileId || typeof body.fileId !== 'string') {
      throw new WsException('fileId is required');
    }

    if (!isUUID(body.fileId)) {
      throw new WsException('fileId must be a UUID');
    }

    return body.fileId;
  }
}
