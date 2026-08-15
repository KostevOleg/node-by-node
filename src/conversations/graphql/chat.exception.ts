import { GraphQLError } from 'graphql';

export class ChatGraphqlException extends GraphQLError {
  constructor(message: string, code: string, httpStatus: number) {
    super(message, {
      extensions: {
        code,
        httpStatus,
      },
    });
  }
}
