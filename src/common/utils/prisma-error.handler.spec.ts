import { InternalServerErrorException, Logger } from '@nestjs/common';
import { prismaErrorHandler } from './prisma-error.handler';

describe('prismaErrorHandler', () => {
  let loggerErrorSpy: jest.SpiedFunction<typeof Logger.prototype.error>;

  beforeEach(() => {
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('logs unhandled errors before returning a generic database error', async () => {
    const error = new Error('Connection failed');

    await expect(
      prismaErrorHandler(() => Promise.reject(error)),
    ).rejects.toThrow(InternalServerErrorException);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Unhandled Prisma error',
      error.stack,
    );
  });
});
