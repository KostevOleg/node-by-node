import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { RagIngestionStatusChangedMessage } from '../ingestion/messages/rag-ingestion-status-changed.message';

@Injectable()
export class RagRealtimeService {
  private server: Server | null = null;

  bindServer(server: Server): void {
    this.server = server;
  }

  ragFileRoom(fileId: string): string {
    return `rag:file:${fileId}`;
  }

  broadcastStatusChanged(message: RagIngestionStatusChangedMessage): void {
    this.server
      ?.to(this.ragFileRoom(message.fileId))
      .emit('statusChanged', message);
  }
}
