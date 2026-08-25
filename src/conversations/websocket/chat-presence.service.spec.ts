import { ChatPresenceService } from './chat-presence.service';

describe('ChatPresenceService', () => {
  const user = {
    id: '11111111-1111-1111-1111-111111111111',
    organizationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'first@example.com',
  };

  let service: ChatPresenceService;

  beforeEach(() => {
    service = new ChatPresenceService();
  });

  it('marks a user online on the first connection only', () => {
    expect(service.trackConnection(user, 'socket-1')).toEqual({
      becameOnline: true,
    });
    expect(service.trackConnection(user, 'socket-2')).toEqual({
      becameOnline: false,
    });
    expect(service.isOnline(user.id)).toBe(true);
  });

  it('marks a user offline only after the last connection disconnects', () => {
    service.trackConnection(user, 'socket-1');
    service.trackConnection(user, 'socket-2');

    expect(service.untrackConnection(user, 'socket-1')).toEqual({
      becameOffline: false,
    });
    expect(service.isOnline(user.id)).toBe(true);

    expect(service.untrackConnection(user, 'socket-2')).toEqual({
      becameOffline: true,
    });
    expect(service.isOnline(user.id)).toBe(false);
  });

  it('returns only online users from a candidate list', () => {
    service.trackConnection(user, 'socket-1');

    expect(service.getOnlineUserIds([user.id, 'offline-user-id'])).toEqual([
      user.id,
    ]);
  });
});
