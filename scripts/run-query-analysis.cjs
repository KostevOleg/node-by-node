require('dotenv/config');

const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function explain(title, sql) {
  const rows = await prisma.$queryRawUnsafe(sql);

  console.log(`\n## ${title}\n`);
  for (const row of rows) {
    console.log(row['QUERY PLAN']);
  }
}

async function getSeedIds() {
  const [user] = await prisma.$queryRawUnsafe(`
    SELECT "organizationId", id
    FROM "User"
    WHERE "deletedAt" IS NULL
    ORDER BY "createdAt" DESC
    LIMIT 1
  `);

  const [conversation] = await prisma.$queryRawUnsafe(`
    SELECT id
    FROM "Conversation"
    WHERE "userId" = $1
      AND "deletedAt" IS NULL
    ORDER BY "createdAt" DESC
    LIMIT 1
  `, user.id);

  const [messageConversation] = await prisma.$queryRawUnsafe(`
    SELECT "conversationId"
    FROM "Message"
    WHERE "deletedAt" IS NULL
    GROUP BY "conversationId"
    ORDER BY count(*) DESC
    LIMIT 1
  `);

  return {
    email: 'user-1@example.com',
    organizationId: user.organizationId,
    userId: user.id,
    conversationId: conversation.id,
    messageConversationId: messageConversation.conversationId,
  };
}

async function main() {
  const counts = await prisma.$queryRawUnsafe(`
    SELECT
      (SELECT count(*)::int FROM "User") AS users,
      (SELECT count(*)::int FROM "Conversation") AS conversations,
      (SELECT count(*)::int FROM "Message") AS messages,
      (SELECT count(*)::int FROM "Session") AS sessions
  `);

  console.log('Dataset counts');
  console.table(counts);

  console.log('\nRunning ANALYZE...');
  await prisma.$executeRawUnsafe('ANALYZE');

  const ids = await getSeedIds();
  console.log('\nSample ids');
  console.table([ids]);

  await explain(
    'Find User by Email',
    `
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT *
      FROM "User"
      WHERE "email" = '${ids.email}'
        AND "deletedAt" IS NULL
    `,
  );

  await explain(
    'List Organization Users',
    `
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT *
      FROM "User"
      WHERE "organizationId" = '${ids.organizationId}'::uuid
        AND "deletedAt" IS NULL
      ORDER BY "createdAt" DESC
      LIMIT 50
    `,
  );

  await explain(
    'List User Conversations',
    `
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT *
      FROM "Conversation"
      WHERE "userId" = '${ids.userId}'::uuid
        AND "deletedAt" IS NULL
      ORDER BY "createdAt" DESC
      LIMIT 50
    `,
  );

  await explain(
    'List Conversation Messages',
    `
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT *
      FROM "Message"
      WHERE "conversationId" = '${ids.messageConversationId}'::uuid
        AND "deletedAt" IS NULL
      ORDER BY "createdAt" ASC
      LIMIT 50
    `,
  );

  await explain(
    'List Active Sessions',
    `
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT *
      FROM "Session"
      WHERE "status" = 'ACTIVE'
        AND "revokedAt" IS NULL
      ORDER BY "createdAt" DESC
      LIMIT 50
    `,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
