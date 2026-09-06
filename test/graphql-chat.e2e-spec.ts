import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { ObjectStorageService } from '../src/files/storage/object-storage.service';
import { VirusScanService } from '../src/files/virus-scan.service';
import { PrismaService } from '../src/prisma/prisma-service';
import { OutboxService } from '../src/outbox/outbox.service';
import { DocumentProcessingPublisher } from '../src/queue/document-processing/publisher';
import { QdrantVectorStoreService } from '../src/rag/core/qdrant-vector-store.service';
import { RagStatusEventsConsumer } from '../src/rag/realtime/rag-status-events.consumer';

jest.setTimeout(30000);

type GraphqlResponse<TData = Record<string, unknown>> = {
  body: {
    data?: TData;
    errors?: Array<{
      message: string;
      extensions?: Record<string, unknown>;
    }>;
  };
};

describe('GraphQL chat API (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let accessToken: string;

  const suffix = randomUUID();
  const organizationId = randomUUID();
  const firstUserId = randomUUID();
  const secondUserId = randomUUID();
  const sessionId = randomUUID();

  const graphql = (query: string, variables?: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ query, variables });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OutboxService)
      .useValue({
        enqueue: jest.fn(),
      })
      .overrideProvider(DocumentProcessingPublisher)
      .useValue({})
      .overrideProvider(QdrantVectorStoreService)
      .useValue({})
      .overrideProvider(RagStatusEventsConsumer)
      .useValue({})
      .overrideProvider(ObjectStorageService)
      .useValue({
        putObject: jest.fn(),
        deleteObject: jest.fn(),
      })
      .overrideProvider(VirusScanService)
      .useValue({
        assertClean: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prismaService = moduleFixture.get(PrismaService);
    jwtService = moduleFixture.get(JwtService);

    await prismaService.organization.create({
      data: {
        id: organizationId,
        name: `GraphQL Chat Test ${suffix}`,
        slug: `graphql-chat-test-${suffix}`,
      },
    });
    await prismaService.user.createMany({
      data: [
        {
          id: firstUserId,
          organizationId,
          email: `graphql-chat-first-${suffix}@example.com`,
          passwordHash: 'unused',
          firstName: 'Graphql',
          lastName: 'First',
        },
        {
          id: secondUserId,
          organizationId,
          email: `graphql-chat-second-${suffix}@example.com`,
          passwordHash: 'unused',
          firstName: 'Graphql',
          lastName: 'Second',
        },
      ],
    });
    await prismaService.session.create({
      data: {
        id: sessionId,
        userId: firstUserId,
        refreshTokenHash: 'unused',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    accessToken = await jwtService.signAsync({
      sub: firstUserId,
      email: `graphql-chat-first-${suffix}@example.com`,
      type: 'access',
      sessionId,
    });
  });

  afterAll(async () => {
    if (!prismaService) {
      await app?.close();
      return;
    }

    await prismaService.message.deleteMany({
      where: {
        conversation: {
          organizationId,
        },
      },
    });
    await prismaService.conversationParticipant.deleteMany({
      where: {
        conversation: {
          organizationId,
        },
      },
    });
    await prismaService.conversation.deleteMany({
      where: {
        organizationId,
      },
    });
    await prismaService.session.deleteMany({
      where: {
        userId: {
          in: [firstUserId, secondUserId],
        },
      },
    });
    await prismaService.user.deleteMany({
      where: {
        id: {
          in: [firstUserId, secondUserId],
        },
      },
    });
    await prismaService.organization.delete({
      where: {
        id: organizationId,
      },
    });
    await app.close();
  });

  it('rejects unauthenticated GraphQL requests', async () => {
    const response = (await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
            query MyChats {
              myChats {
                data {
                  id
                }
              }
            }
          `,
      })
      .expect(200)) as GraphqlResponse;

    expect(response.body.errors?.[0]?.message).toBe('Unauthorized');
  });

  it('creates, reads, updates, and deletes a direct chat through GraphQL', async () => {
    const createResponse = (await graphql(
      `
        mutation CreateChat($participantId: ID!) {
          createChat(
            input: {
              participantId: $participantId
              firstMessage: "hello from graphql e2e"
            }
          ) {
            id
            organizationId
            participants {
              userId
              email
            }
            lastMessage {
              id
              chatId
              senderId
              content
            }
          }
        }
      `,
      { participantId: secondUserId },
    ).expect(200)) as GraphqlResponse<{
      createChat: {
        id: string;
        organizationId: string;
        participants: Array<{ userId: string; email: string }>;
        lastMessage: {
          id: string;
          chatId: string;
          senderId: string;
          content: string;
        };
      };
    }>;

    expect(createResponse.body.errors).toBeUndefined();
    const chat = createResponse.body.data?.createChat;
    if (!chat) {
      throw new Error('createChat did not return a chat');
    }

    expect(chat).toMatchObject({
      organizationId,
      lastMessage: {
        senderId: firstUserId,
        content: 'hello from graphql e2e',
      },
    });
    expect(
      chat?.participants.map((participant) => participant.userId).sort(),
    ).toEqual([firstUserId, secondUserId].sort());

    const myChatsResponse = (await graphql(`
      query MyChats {
        myChats(input: { take: 10 }) {
          data {
            id
            participants {
              userId
            }
            lastMessage {
              content
            }
          }
          nextCursor
        }
      }
    `).expect(200)) as GraphqlResponse<{
      myChats: {
        data: Array<{
          id: string;
          participants: Array<{ userId: string }>;
          lastMessage: { content: string } | null;
        }>;
        nextCursor: string | null;
      };
    }>;

    expect(myChatsResponse.body.errors).toBeUndefined();
    const listedChat = myChatsResponse.body.data?.myChats.data.find(
      (myChat) => myChat.id === chat.id,
    );
    expect(listedChat?.lastMessage?.content).toBe('hello from graphql e2e');

    const sendResponse = (await graphql(
      `
        mutation SendMessage($chatId: ID!) {
          sendMessage(
            input: { chatId: $chatId, content: "second graphql message" }
          ) {
            id
            chatId
            senderId
            content
          }
        }
      `,
      { chatId: chat.id },
    ).expect(200)) as GraphqlResponse<{
      sendMessage: {
        id: string;
        chatId: string;
        senderId: string;
        content: string;
      };
    }>;

    expect(sendResponse.body.errors).toBeUndefined();
    const message = sendResponse.body.data?.sendMessage;
    if (!message) {
      throw new Error('sendMessage did not return a message');
    }

    expect(message).toMatchObject({
      chatId: chat.id,
      senderId: firstUserId,
      content: 'second graphql message',
    });

    const messagesResponse = (await graphql(
      `
        query ChatMessages($chatId: ID!) {
          chatMessages(input: { chatId: $chatId, take: 10 }) {
            data {
              id
              senderId
              content
            }
            nextCursor
          }
        }
      `,
      { chatId: chat.id },
    ).expect(200)) as GraphqlResponse<{
      chatMessages: {
        data: Array<{ id: string; senderId: string; content: string }>;
        nextCursor: string | null;
      };
    }>;

    expect(messagesResponse.body.errors).toBeUndefined();
    expect(messagesResponse.body.data?.chatMessages.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: message.id,
          senderId: firstUserId,
          content: 'second graphql message',
        }),
      ]),
    );

    const updateResponse = (await graphql(
      `
        mutation UpdateMessage($messageId: ID!) {
          updateMessage(
            input: { messageId: $messageId, content: "updated graphql message" }
          ) {
            id
            content
          }
        }
      `,
      { messageId: message.id },
    ).expect(200)) as GraphqlResponse<{
      updateMessage: {
        id: string;
        content: string;
      };
    }>;

    expect(updateResponse.body.errors).toBeUndefined();
    expect(updateResponse.body.data?.updateMessage).toEqual({
      id: message.id,
      content: 'updated graphql message',
    });

    const deleteMessageResponse = (await graphql(
      `
        mutation DeleteMessage($messageId: ID!) {
          deleteMessage(messageId: $messageId) {
            id
            content
          }
        }
      `,
      { messageId: message.id },
    ).expect(200)) as GraphqlResponse<{
      deleteMessage: {
        id: string;
        content: string;
      };
    }>;

    expect(deleteMessageResponse.body.errors).toBeUndefined();
    expect(deleteMessageResponse.body.data?.deleteMessage.id).toBe(message.id);

    const deleteChatResponse = (await graphql(
      `
        mutation DeleteChat($chatId: ID!) {
          deleteChat(chatId: $chatId)
        }
      `,
      { chatId: chat.id },
    ).expect(200)) as GraphqlResponse<{ deleteChat: boolean }>;

    expect(deleteChatResponse.body.errors).toBeUndefined();
    expect(deleteChatResponse.body.data?.deleteChat).toBe(true);
  });
});
