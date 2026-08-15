import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { GraphQLError } from 'graphql';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  it('formats HTTP exceptions', () => {
    const filter = new HttpExceptionFilter();
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const request = {
      url: '/users/missing',
    };
    const host = {
      getType: () => 'http',
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new NotFoundException('User not found'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 404,
        detail: 'User not found',
        instance: '/users/missing',
      }),
    );
  });

  it('does not handle GraphQL exceptions as HTTP responses', () => {
    const filter = new HttpExceptionFilter();
    const exception = new GraphQLError('Chat not found', {
      extensions: {
        code: 'CHAT_NOT_FOUND',
      },
    });
    const host = {
      getType: () => 'graphql',
    } as unknown as ArgumentsHost;

    expect(() => filter.catch(exception, host)).toThrow(exception);
  });
});
