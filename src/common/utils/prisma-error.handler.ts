import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

export async function prismaErrorHandler<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
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
    throw new InternalServerErrorException('Database error');
  }
}
