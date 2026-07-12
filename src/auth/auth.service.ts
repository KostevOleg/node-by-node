import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SignInDto } from './dto/sign-in.dto';
import { PrismaService } from 'src/prisma/prisma-service';
import { JwtService } from '@nestjs/jwt';
import { serialize } from 'src/common/utils/serialize';
import { UserResponseDto } from 'src/users/dto/user-response.dto';
import type { JwtSignOptions } from '@nestjs/jwt';
import { SignOutDto } from './dto/sign-out.dto';
import { RefreshDto } from './dto/refresh.dto';
import { prismaErrorHandler } from 'src/common/utils/prisma-error.handler';
import * as bcrypt from 'bcrypt';

type RefreshTokenPayload = {
  sub: string;
  email: string;
  type: 'refresh';
  sessionId: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}
  accessTokenExpiresIn: JwtSignOptions['expiresIn'] =
    (process.env.JWT_ACCESS_TOKEN_EXPIRES_IN as JwtSignOptions['expiresIn']) ??
    '15m';
  refreshTokenExpiresIn: JwtSignOptions['expiresIn'] =
    (process.env.JWT_REFRESH_TOKEN_EXPIRES_IN as JwtSignOptions['expiresIn']) ??
    '30d';

  async signIn(_dto: SignInDto) {
    const user = await prismaErrorHandler(() =>
      this.prismaService.user.findFirst({
        where: {
          email: _dto.email,
          deletedAt: null,
          status: 'ACTIVE',
        },
      }),
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentions');
    }
    const isValidPassword = await bcrypt.compare(
      _dto.password,
      user.passwordHash,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentions');
    }
    const session = await prismaErrorHandler(() =>
      this.prismaService.session.create({
        data: {
          userId: user.id,
          refreshTokenHash: 'pending',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        },
      }),
    );

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        type: 'access',
        sessionId: session.id,
      },
      { expiresIn: this.accessTokenExpiresIn },
    );
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        type: 'refresh',
        sessionId: session.id,
      },
      { expiresIn: this.refreshTokenExpiresIn },
    );
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await prismaErrorHandler(() =>
      this.prismaService.session.update({
        where: {
          id: session.id,
        },
        data: {
          refreshTokenHash,
        },
      }),
    );
    const serializedUser = serialize(UserResponseDto, user);
    return {
      accessToken,
      refreshToken,
      user: serializedUser,
    };
  }
  async signOut(dto: SignOutDto) {
    const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
      dto.refreshToken,
    );

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token');
    }

    const session = await prismaErrorHandler(() =>
      this.prismaService.session.findUnique({
        where: {
          id: payload.sessionId,
        },
      }),
    );

    if (!session) {
      throw new UnauthorizedException('Invalid token');
    }
    if (session.revokedAt) {
      throw new UnauthorizedException('Invalid token');
    }

    const isValidRefresh = await bcrypt.compare(
      dto.refreshToken,
      session.refreshTokenHash,
    );

    if (!isValidRefresh) {
      throw new UnauthorizedException('Invalid token');
    }

    await prismaErrorHandler(() =>
      this.prismaService.session.update({
        where: {
          id: session.id,
        },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
        },
      }),
    );
  }
  async refresh(dto: RefreshDto) {
    const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
      dto.refreshToken,
    );

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token');
    }

    const session = await prismaErrorHandler(() =>
      this.prismaService.session.findUnique({
        where: {
          id: payload.sessionId,
        },
      }),
    );

    if (!session || session?.revokedAt) {
      throw new UnauthorizedException('Invalid token');
    }
    const isValidRefresh = await bcrypt.compare(
      dto.refreshToken,
      session.refreshTokenHash,
    );

    if (!isValidRefresh) {
      throw new UnauthorizedException('Invalid token');
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
      throw new UnauthorizedException('Invalid token');
    }

    const newAccessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        type: 'access',
        sessionId: session.id,
      },
      { expiresIn: this.accessTokenExpiresIn },
    );
    const newRefreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        type: 'refresh',
        sessionId: session.id,
      },
      { expiresIn: this.refreshTokenExpiresIn },
    );
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

    await prismaErrorHandler(() =>
      this.prismaService.session.update({
        where: {
          id: session.id,
        },
        data: {
          refreshTokenHash: newRefreshTokenHash,
        },
      }),
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
}
