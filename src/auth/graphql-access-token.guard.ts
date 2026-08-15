import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthenticatedRequest } from './types/authenticated-request';
import { AccessTokenGuard } from './access-token.guard';

@Injectable()
export class GraphqlAccessTokenGuard extends AccessTokenGuard {
  protected getRequest(context: ExecutionContext): AuthenticatedRequest {
    const gqlContext = GqlExecutionContext.create(context);
    return gqlContext.getContext<{ req: AuthenticatedRequest }>().req;
  }
}
