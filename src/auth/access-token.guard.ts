import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma-service';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { prismaErrorHandler } from 'src/common/utils/prisma-error.handler';
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
    const request: Request = context.switchToHttp().getRequest();
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
    const payload =
      await this.jwtService.verifyAsync<AccessTokenPayload>(token);
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
    if (!session || session.status !== 'ACTIVE' || session.revokedAt) {
      throw new UnauthorizedException('Unauthorized');
    }

    return true;
  }
}
