import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
  AuthenticatedRequest,
  AuthenticatedUser,
} from '../types/authenticated-request';
export const GqlCurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const gqlContext = GqlExecutionContext.create(context);
    const req = gqlContext.getContext<{ req: AuthenticatedRequest }>().req;
    return req.user;
  },
);
