import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { MessagesService } from '../src/messages/messages.service';
import { UserResponseDto } from '../src/users/dto/user-response.dto';
import { MessageResponseDto } from '../src/messages/dto/message-response.dto';

const PAGE_SIZE = 100;

type OffsetPage<T> = {
  data: T[];
  limit: number;
  offset: number;
};

type CursorPage<T> = {
  data: T[];
  nextCursor: string | null;
};

describe('Pagination against seeded data (e2e)', () => {
  let moduleFixture: TestingModule;
  let usersService: UsersService;
  let messagesService: MessagesService;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    usersService = moduleFixture.get(UsersService);
    messagesService = moduleFixture.get(MessagesService);
  });

  afterAll(async () => {
    await moduleFixture?.close();
  });

  it('walks users pages without duplicates', async () => {
    const seenIds = new Set<string>();
    let offset = 0;
    let hasNextPage = false;

    do {
      const page = (await usersService.getUsersPage(
        PAGE_SIZE,
        offset,
      )) as unknown as OffsetPage<UserResponseDto>;

      for (const user of page.data) {
        expect(seenIds.has(user.id)).toBe(false);
        seenIds.add(user.id);
      }

      hasNextPage = page.data.length === PAGE_SIZE;
      offset += PAGE_SIZE;
    } while (hasNextPage);

    expect(seenIds.size).toBeGreaterThan(0);
    expect(hasNextPage).toBe(false);
  });

  it('walks messages pages without duplicates', async () => {
    const seenIds = new Set<string>();
    let cursor: string | undefined;
    let nextCursor: string | null = null;

    do {
      const page = (await messagesService.getMessagesPage(
        cursor,
        PAGE_SIZE,
      )) as unknown as CursorPage<MessageResponseDto>;

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
