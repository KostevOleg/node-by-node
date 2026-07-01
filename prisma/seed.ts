import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  MessageSender,
  MessageStatus,
  OrganizationStatus,
  PrismaClient,
} from '@prisma/client';
import type { Conversation, Organization, Prisma, User } from '@prisma/client';

const organizationMocks: Prisma.OrganizationCreateManyInput[] = [
  {
    name: 'Umbrella Corporation',
    slug: 'umbrella-corporation',
    description: 'Global pharmaceutical and biotechnology corporation.',
    status: OrganizationStatus.ACTIVE,
  },
  {
    name: 'Black Mesa Research Facility',
    slug: 'black-mesa',
    description:
      'Advanced research organization focused on experimental technologies.',
    status: OrganizationStatus.ACTIVE,
  },
  {
    name: 'Aperture Science',
    slug: 'aperture-science',
    description:
      'Research company specializing in applied science and automation.',
    status: OrganizationStatus.ACTIVE,
  },
  {
    name: 'Weyland-Yutani Corporation',
    slug: 'weyland-yutani',
    description:
      'Industrial corporation with logistics and deep-space operations.',
    status: OrganizationStatus.ACTIVE,
  },
  {
    name: 'Cyberdyne Systems',
    slug: 'cyberdyne-systems',
    description: 'Technology company building advanced computer systems.',
    status: OrganizationStatus.ACTIVE,
  },
  {
    name: 'InGen',
    slug: 'ingen',
    description:
      'Genetics research company with large-scale laboratory operations.',
    status: OrganizationStatus.ACTIVE,
  },
  {
    name: 'Abstergo Industries',
    slug: 'abstergo-industries',
    description:
      'Multinational organization focused on security and historical research.',
    status: OrganizationStatus.ACTIVE,
  },
  {
    name: 'Vault-Tec Corporation',
    slug: 'vault-tec',
    description:
      'Infrastructure company specializing in long-term shelter systems.',
    status: OrganizationStatus.ACTIVE,
  },
  {
    name: 'Wayne Enterprises',
    slug: 'wayne-enterprises',
    description:
      'Diversified enterprise with technology, finance, and manufacturing divisions.',
    status: OrganizationStatus.ACTIVE,
  },
  {
    name: 'Stark Industries',
    slug: 'stark-industries',
    description: 'Engineering and defense technology company.',
    status: OrganizationStatus.ACTIVE,
  },
];
const firstNames = [
  'Liam',
  'Noah',
  'Oliver',
  'Elijah',
  'James',
  'William',
  'Benjamin',
  'Lucas',
  'Henry',
  'Alexander',
  'Ethan',
  'Michael',
  'Daniel',
  'Jacob',
  'Logan',
  'Jackson',
  'Levi',
  'Sebastian',
  'Mateo',
  'Jack',
];

const lastNames = [
  'Smith',
  'Johnson',
  'Brown',
  'Taylor',
  'Anderson',
  'Thomas',
  'Jackson',
  'White',
  'Harris',
  'Martin',
  'Thompson',
  'Moore',
  'Walker',
  'Young',
  'King',
  'Scott',
  'Green',
  'Baker',
  'Adams',
  'Nelson',
];

const conversationScenarios = [
  {
    title: 'Password reset',
    userProblems: [
      'I cannot reset my password.',
      'The reset link says it has expired.',
      'I requested a password reset but did not receive an email.',
      'The new password is not accepted by the form.',
    ],
    assistantReplies: [
      'Please check whether the reset email is in your spam folder.',
      'The reset link is valid for a limited time. Try requesting a new one.',
      'Make sure your new password meets all security requirements.',
      'I can help you troubleshoot the password reset flow step by step.',
    ],
  },
  {
    title: 'API integration',
    userProblems: [
      'I am getting a 401 error from the API.',
      'The webhook payload does not match the documentation.',
      'My API key works locally but fails in production.',
      'The integration stops working after the access token expires.',
    ],
    assistantReplies: [
      'A 401 response usually means the request is missing a valid token.',
      'Check that the webhook secret is the same in both environments.',
      'Production may be using a different environment variable.',
      'You probably need to refresh the access token before retrying the request.',
    ],
  },
  {
    title: 'Billing question',
    userProblems: [
      'I was charged twice this month.',
      'I need a copy of my invoice.',
      'My payment failed even though the card is valid.',
      'I want to change the billing email.',
    ],
    assistantReplies: [
      'I can help you review the latest billing activity.',
      'Invoices are usually available in the billing settings.',
      'Payment failures can happen because of bank-side verification.',
      'The billing email can be updated from the organization settings.',
    ],
  },
];

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await clearDatabase();

  const organization = await createOrganizations();
  const users = await createUsers(organization);
  await createSessions(users);
  const conversations = await createConversations(users);
  await createMessages(conversations);

  console.log(
    `Seed script is ready with ${organizationMocks.length} organization mocks.`,
  );
}

async function clearDatabase() {
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.session.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
}

async function createOrganizations() {
  await prisma.organization.createMany({
    data: organizationMocks,
    skipDuplicates: true,
  });
  return prisma.organization.findMany({
    where: {
      slug: {
        in: organizationMocks.map((organization) => organization.slug),
      },
    },
  });
}

async function createUsers(organizations: Organization[]) {
  const userMocks: Prisma.UserCreateManyInput[] = [];
  for (let i = 0; i < 1000; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const organization = organizations[i % organizations.length];
    userMocks.push({
      organizationId: organization.id,
      email: `user-${i + 1}@example.com`,
      passwordHash: `hashed-password-${i + 1}`,
      firstName: firstName,
      lastName: lastName,
      status: i % 10 === 0 ? 'INACTIVE' : 'ACTIVE',
    });
  }
  await prisma.user.createMany({
    data: userMocks,
    skipDuplicates: true,
  });
  return prisma.user.findMany({
    where: {
      email: {
        in: userMocks.map((user) => user.email),
      },
    },
  });
}

async function createConversations(users: User[]) {
  const conversationMocks: Prisma.ConversationCreateManyInput[] = [];

  for (const user of users) {
    for (let i = 0; i < 5; i++) {
      const scenario = conversationScenarios[i % conversationScenarios.length];

      conversationMocks.push({
        userId: user.id,
        title: `${scenario.title} #${i + 1} for ${user.email}`,
      });
    }
  }

  await prisma.conversation.createMany({
    data: conversationMocks,
  });

  return prisma.conversation.findMany({
    where: {
      userId: {
        in: users.map((user) => user.id),
      },
    },
  });
}

async function createMessages(conversations: Conversation[]) {
  const batchSize = 1000;
  const messagesPerConversation = 10;
  let messageMocks: Prisma.MessageCreateManyInput[] = [];

  for (
    let conversationIndex = 0;
    conversationIndex < conversations.length;
    conversationIndex++
  ) {
    const conversation = conversations[conversationIndex];
    const scenario =
      conversationScenarios[conversationIndex % conversationScenarios.length];

    for (
      let messageIndex = 0;
      messageIndex < messagesPerConversation;
      messageIndex++
    ) {
      const isUserMessage = messageIndex % 2 === 0;
      const content = isUserMessage
        ? scenario.userProblems[messageIndex % scenario.userProblems.length]
        : scenario.assistantReplies[
            messageIndex % scenario.assistantReplies.length
          ];

      messageMocks.push({
        conversationId: conversation.id,
        sender: isUserMessage ? MessageSender.USER : MessageSender.ASSISTANT,
        content,
        status: MessageStatus.SENT,
        tokenCount: content.split(' ').length,
      });

      if (messageMocks.length === batchSize) {
        await prisma.message.createMany({
          data: messageMocks,
        });
        messageMocks = [];
      }
    }
  }

  if (messageMocks.length > 0) {
    await prisma.message.createMany({
      data: messageMocks,
    });
  }
}

async function createSessions(users: User[]) {
  const activeUsers = users.filter((user) => user.status === 'ACTIVE');
  const sessionMocks: Prisma.SessionCreateManyInput[] = [];

  for (const user of activeUsers) {
    sessionMocks.push({
      userId: user.id,
      refreshTokenHash: `refresh-token-hash-${user.id}`,
      userAgent: 'Mozilla/5.0',
      ipAddress: '127.0.0.1',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    });
  }

  return prisma.session.createMany({
    data: sessionMocks,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
