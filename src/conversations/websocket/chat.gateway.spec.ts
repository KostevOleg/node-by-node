import { WsException } from '@nestjs/websockets';
import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedUser } from 'src/auth/types/authenticated-request';
import { ConversationsService } from '../conversations.service';
import { ChatGateway } from './chat.gateway';
import { ChatPresenceService } from './chat-presence.service';
import { ChatRealtimeService } from './chat-realtime.service';

type MockSocket = {
  id: string;
  data: {
    user?: AuthenticatedUser;
  };
  handshake: {
    auth?: {
      token?: unknown;
    };
  };
  disconnect: jest.Mock;
  join: jest.Mock;
  leave: jest.Mock;
};

describe('ChatGateway', () => {
  const user: AuthenticatedUser = {
    id: '11111111-1111-1111-1111-111111111111',
    organizationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'first@example.com',
  };
  const chatId = '22222222-2222-2222-2222-222222222222';
  const participantIds = [user.id, '33333333-3333-3333-3333-333333333333'];

  let gateway: ChatGateway;
  let authService: {
    authenticateAccessToken: jest.Mock;
  };
  let conversationsService: {
    assertCanAccessChat: jest.Mock;
    getAccessibleChatParticipantIds: jest.Mock;
  };
  let presenceService: {
    trackConnection: jest.Mock;
    untrackConnection: jest.Mock;
    getOnlineUserIds: jest.Mock;
  };
  let realtimeService: {
    bindServer: jest.Mock;
    chatRoom: jest.Mock;
    organizationRoom: jest.Mock;
    userRoom: jest.Mock;
    broadcastUserOnline: jest.Mock;
    broadcastUserOffline: jest.Mock;
    broadcastUserJoinedChat: jest.Mock;
    broadcastUserLeftChat: jest.Mock;
    broadcastUserTyping: jest.Mock;
  };

  const createSocket = (token: unknown = 'access-token'): MockSocket => ({
    id: 'socket-1',
    data: {},
    handshake: {
      auth: {
        token,
      },
    },
    disconnect: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
  });

  beforeEach(() => {
    authService = {
      authenticateAccessToken: jest.fn().mockResolvedValue(user),
    };
    conversationsService = {
      assertCanAccessChat: jest.fn().mockResolvedValue(undefined),
      getAccessibleChatParticipantIds: jest
        .fn()
        .mockResolvedValue(participantIds),
    };
    presenceService = {
      trackConnection: jest.fn().mockReturnValue({ becameOnline: true }),
      untrackConnection: jest.fn().mockReturnValue({ becameOffline: true }),
      getOnlineUserIds: jest.fn().mockReturnValue([user.id]),
    };
    realtimeService = {
      bindServer: jest.fn(),
      chatRoom: jest.fn((id: string) => `chat:${id}`),
      organizationRoom: jest.fn((id: string) => `organization:${id}`),
      userRoom: jest.fn((id: string) => `user:${id}`),
      broadcastUserOnline: jest.fn(),
      broadcastUserOffline: jest.fn(),
      broadcastUserJoinedChat: jest.fn(),
      broadcastUserLeftChat: jest.fn(),
      broadcastUserTyping: jest.fn(),
    };

    gateway = new ChatGateway(
      authService as unknown as AuthService,
      conversationsService as unknown as ConversationsService,
      realtimeService as unknown as ChatRealtimeService,
      presenceService as unknown as ChatPresenceService,
    );
  });

  it('binds the socket server after initialization', () => {
    const server = {};

    gateway.afterInit(server as never);

    expect(realtimeService.bindServer).toHaveBeenCalledWith(server);
  });

  it('authenticates a connection, joins the organization room, and broadcasts first online transition', async () => {
    const socket = createSocket();

    await gateway.handleConnection(socket as never);

    expect(authService.authenticateAccessToken).toHaveBeenCalledWith(
      'access-token',
    );
    expect(socket.data.user).toBe(user);
    expect(realtimeService.userRoom).toHaveBeenCalledWith(user.id);
    expect(socket.join).toHaveBeenCalledWith(`user:${user.id}`);
    expect(realtimeService.organizationRoom).toHaveBeenCalledWith(
      user.organizationId,
    );
    expect(socket.join).toHaveBeenCalledWith(
      `organization:${user.organizationId}`,
    );
    expect(presenceService.trackConnection).toHaveBeenCalledWith(
      user,
      socket.id,
    );
    expect(realtimeService.broadcastUserOnline).toHaveBeenCalledWith(
      user.id,
      user.organizationId,
    );
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it('does not broadcast online when the user already had another active socket', async () => {
    presenceService.trackConnection.mockReturnValue({ becameOnline: false });
    const socket = createSocket();

    await gateway.handleConnection(socket as never);

    expect(realtimeService.broadcastUserOnline).not.toHaveBeenCalled();
  });

  it('disconnects clients without a string token or with invalid auth', async () => {
    const missingTokenSocket = createSocket();
    delete missingTokenSocket.handshake.auth?.token;

    await gateway.handleConnection(missingTokenSocket as never);

    expect(missingTokenSocket.disconnect).toHaveBeenCalledTimes(1);
    expect(authService.authenticateAccessToken).not.toHaveBeenCalled();

    const invalidTokenSocket = createSocket('bad-token');
    authService.authenticateAccessToken.mockRejectedValueOnce(
      new Error('Unauthorized'),
    );

    await gateway.handleConnection(invalidTokenSocket as never);

    expect(invalidTokenSocket.disconnect).toHaveBeenCalledTimes(1);
  });

  it('untracks a disconnected user and broadcasts offline only for the last socket', () => {
    const socket = createSocket();
    socket.data.user = user;

    gateway.handleDisconnect(socket as never);

    expect(presenceService.untrackConnection).toHaveBeenCalledWith(
      user,
      socket.id,
    );
    expect(realtimeService.broadcastUserOffline).toHaveBeenCalledWith(
      user.id,
      user.organizationId,
    );

    jest.clearAllMocks();
    presenceService.untrackConnection.mockReturnValue({
      becameOffline: false,
    });

    gateway.handleDisconnect(socket as never);

    expect(realtimeService.broadcastUserOffline).not.toHaveBeenCalled();
  });

  it('ignores disconnects for unauthenticated sockets', () => {
    const socket = createSocket();

    gateway.handleDisconnect(socket as never);

    expect(presenceService.untrackConnection).not.toHaveBeenCalled();
    expect(realtimeService.broadcastUserOffline).not.toHaveBeenCalled();
  });

  it('joins an accessible chat and returns the initial online participant ids', async () => {
    const socket = createSocket();
    socket.data.user = user;

    await expect(
      gateway.joinChat(socket as never, { chatId }),
    ).resolves.toEqual({
      ok: true,
      chatId,
      onlineUserIds: [user.id],
    });

    expect(
      conversationsService.getAccessibleChatParticipantIds,
    ).toHaveBeenCalledWith(user, chatId);
    expect(socket.join).toHaveBeenCalledWith(`chat:${chatId}`);
    expect(presenceService.getOnlineUserIds).toHaveBeenCalledWith(
      participantIds,
    );
    expect(realtimeService.broadcastUserJoinedChat).toHaveBeenCalledWith(
      chatId,
      user.id,
    );
  });

  it('leaves an accessible chat', async () => {
    const socket = createSocket();
    socket.data.user = user;

    await expect(
      gateway.leaveChat(socket as never, { chatId }),
    ).resolves.toEqual({
      ok: true,
      chatId,
    });

    expect(conversationsService.assertCanAccessChat).toHaveBeenCalledWith(
      user,
      chatId,
    );
    expect(socket.leave).toHaveBeenCalledWith(`chat:${chatId}`);
    expect(realtimeService.broadcastUserLeftChat).toHaveBeenCalledWith(
      chatId,
      user.id,
    );
  });

  it('broadcasts typing after access and payload validation', async () => {
    const socket = createSocket();
    socket.data.user = user;

    await expect(
      gateway.typing(socket as never, { chatId, isTyping: true }),
    ).resolves.toEqual({ ok: true });

    expect(conversationsService.assertCanAccessChat).toHaveBeenCalledWith(
      user,
      chatId,
    );
    expect(realtimeService.broadcastUserTyping).toHaveBeenCalledWith(
      chatId,
      user.id,
      true,
    );
  });

  it('rejects unauthenticated or malformed socket events', async () => {
    const socket = createSocket();

    await expect(gateway.joinChat(socket as never, { chatId })).rejects.toThrow(
      WsException,
    );

    socket.data.user = user;

    await expect(
      gateway.joinChat(socket as never, { chatId: '' }),
    ).rejects.toThrow(WsException);
    await expect(
      gateway.typing(socket as never, { chatId, isTyping: 'yes' as never }),
    ).rejects.toThrow(WsException);
  });

  it('returns pong heartbeat payloads', () => {
    const response = gateway.ping();

    expect(response.event).toBe('pong');
    expect(Date.parse(response.data.at)).not.toBeNaN();
  });
});
