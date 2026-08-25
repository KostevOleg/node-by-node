import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from 'src/auth/types/authenticated-request';

@Injectable()
export class ChatPresenceService {
  private readonly onlineUsers = new Map<string, Set<string>>();

  trackConnection(user: AuthenticatedUser, socketId: string) {
    const sockets = this.onlineUsers.get(user.id) ?? new Set<string>();
    const wasOffline = sockets.size === 0;

    sockets.add(socketId);
    this.onlineUsers.set(user.id, sockets);

    return {
      becameOnline: wasOffline,
    };
  }

  untrackConnection(user: AuthenticatedUser, socketId: string) {
    const sockets = this.onlineUsers.get(user.id);

    if (!sockets) {
      return {
        becameOffline: false,
      };
    }

    sockets.delete(socketId);

    if (sockets.size === 0) {
      this.onlineUsers.delete(user.id);

      return {
        becameOffline: true,
      };
    }

    return {
      becameOffline: false,
    };
  }

  getOnlineUserIds(userIds: string[]) {
    return userIds.filter((userId) => this.onlineUsers.has(userId));
  }

  isOnline(userId: string) {
    return this.onlineUsers.has(userId);
  }
}
