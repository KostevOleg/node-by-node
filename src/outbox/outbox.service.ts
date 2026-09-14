import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma-service';

type OutboxPrismaClient = PrismaService | Prisma.TransactionClient;

type EnqueueOutboxMessageInput = {
  exchange: string;
  routingKey: string;
  payload: Prisma.InputJsonValue;
};

@Injectable()
export class OutboxService {
  constructor(private readonly prismaService: PrismaService) {}

  async enqueue(
    input: EnqueueOutboxMessageInput,
    prisma: OutboxPrismaClient = this.prismaService,
  ): Promise<void> {
    await prisma.outboxMessage.create({
      data: {
        exchange: input.exchange,
        routingKey: input.routingKey,
        payload: input.payload,
      },
    });
  }
}
