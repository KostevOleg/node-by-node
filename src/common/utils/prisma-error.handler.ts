import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

const logger = new Logger('PrismaErrorHandler');

export async function prismaErrorHandler<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isTransientConnectionError(error)) {
      try {
        return await operation();
      } catch (retryError) {
        handlePrismaError(retryError);
      }
    }

    handlePrismaError(error);
  }
}

function handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new ConflictException('Duplicate value');
    }
    if (error.code === 'P2003') {
      throw new BadRequestException('Invalid foreign key');
    }
    if (error.code === 'P2025') {
      throw new NotFoundException('Record not found');
    }
  }

  logger.error(
    'Unhandled Prisma error',
    error instanceof Error ? error.stack : String(error),
  );
  throw new InternalServerErrorException('Database error');
}

function isTransientConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return [
    'Server has closed the connection',
    'Connection terminated unexpectedly',
    'ECONNRESET',
    'ECONNREFUSED',
  ].some((message) => error.message.includes(message));
}
