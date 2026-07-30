import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma-service';
import { JwtService } from '@nestjs/jwt';
import { prismaErrorHandler } from 'src/common/utils/prisma-error.handler';
import { AuthenticatedRequest } from './types/authenticated-request';
type AccessTokenPayload = {
  sub: string;
  email: string;
  type: 'access';
  sessionId: string;
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    let payload: AccessTokenPayload;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request) {
      throw new UnauthorizedException('Unauthorized');
    }
    const header = request.headers.authorization;
    if (!header) {
      throw new UnauthorizedException('Unauthorized');
    }
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Unauthorized');
    }
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Unauthorized');
    }
    const session = await prismaErrorHandler(() =>
      this.prismaService.session.findUnique({
        where: {
          id: payload.sessionId,
        },
      }),
    );
    const isSessionActive = session?.status === 'ACTIVE' && !session.revokedAt;
    const isSessionExpired = session ? session.expiresAt <= new Date() : true;
    const isSessionOwner = session?.userId === payload.sub;

    if (!session || !isSessionActive || isSessionExpired || !isSessionOwner) {
      throw new UnauthorizedException('Unauthorized');
    }
    const user = await prismaErrorHandler(() =>
      this.prismaService.user.findFirst({
        where: {
          id: payload.sub,
          deletedAt: null,
          status: 'ACTIVE',
        },
      }),
    );

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }
    request.user = {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
    };
    return true;
  }
}
