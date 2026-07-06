import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { ConversationsService } from '../src/conversations/conversations.service';
import { MessagesService } from '../src/messages/messages.service';

const PAGE_SIZE = 100;

describe('Pagination against seeded data (e2e)', () => {
  let moduleFixture: TestingModule;
  let usersService: UsersService;
  let conversationsService: ConversationsService;
  let messagesService: MessagesService;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    usersService = moduleFixture.get(UsersService);
    conversationsService = moduleFixture.get(ConversationsService);
    messagesService = moduleFixture.get(MessagesService);
  });

  afterAll(async () => {
    await moduleFixture?.close();
  });

  it('walks users pages without duplicates', async () => {
    const seenIds = new Set<string>();
    let cursor: string | undefined;
    let nextCursor: string | null = null;

    do {
      const page = await usersService.getUsersPage(cursor, PAGE_SIZE);

      for (const user of page.data) {
        expect(seenIds.has(user.id)).toBe(false);
        seenIds.add(user.id);
      }

      nextCursor = page.nextCursor;
      cursor = nextCursor ?? undefined;
    } while (nextCursor);

    expect(seenIds.size).toBeGreaterThan(0);
    expect(nextCursor).toBeNull();
  });

  it('walks conversations pages without duplicates', async () => {
    const seenIds = new Set<string>();
    let cursor: string | undefined;
    let nextCursor: string | null = null;

    do {
      const page = await conversationsService.getConversationsPage(
        cursor,
        PAGE_SIZE,
      );

      for (const conversation of page.data) {
        expect(seenIds.has(conversation.id)).toBe(false);
        seenIds.add(conversation.id);
      }

      nextCursor = page.nextCursor;
      cursor = nextCursor ?? undefined;
    } while (nextCursor);

    expect(seenIds.size).toBeGreaterThan(0);
    expect(nextCursor).toBeNull();
  });

  it('walks messages pages without duplicates', async () => {
    const seenIds = new Set<string>();
    let cursor: string | undefined;
    let nextCursor: string | null = null;

    do {
      const page = await messagesService.getMessagesPage(cursor, PAGE_SIZE);

      for (const message of page.data) {
        expect(seenIds.has(message.id)).toBe(false);
        seenIds.add(message.id);
      }

      nextCursor = page.nextCursor;
      cursor = nextCursor ?? undefined;
    } while (nextCursor);

    expect(seenIds.size).toBeGreaterThan(0);
    expect(nextCursor).toBeNull();
  }, 60000);
});
