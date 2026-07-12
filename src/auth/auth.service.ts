import {
  Injectable,
  NotImplementedException,
  UnauthorizedException,
} from '@nestjs/common';
import { SignInDto } from './dto/sign-in.dto';
import { PrismaService } from 'src/prisma/prisma-service';
import { JwtService } from '@nestjs/jwt';
import { serialize } from 'src/common/utils/serialize';
import { UserResponseDto } from 'src/users/dto/user-response.dto';
import type { JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}
  async signIn(_dto: SignInDto) {
    const user = await this.prismaService.user.findFirst({
      where: {
        email: _dto.email,
        deletedAt: null,
        status: 'ACTIVE',
      },
    });
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
    const accessTokenExpiresIn: JwtSignOptions['expiresIn'] =
      (process.env
        .JWT_ACCESS_TOKEN_EXPIRES_IN as JwtSignOptions['expiresIn']) ?? '15m';
    const refreshTokenExpiresIn: JwtSignOptions['expiresIn'] =
      (process.env
        .JWT_REFRESH_TOKEN_EXPIRES_IN as JwtSignOptions['expiresIn']) ?? '30d';
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        type: 'access',
      },
      { expiresIn: accessTokenExpiresIn },
    );
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        type: 'refresh',
      },
      { expiresIn: refreshTokenExpiresIn },
    );
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prismaService.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });
    const serializedUser = serialize(UserResponseDto, user);
    return {
      accessToken,
      refreshToken,
      user: serializedUser,
    };
  }
  signOut() {
    throw new NotImplementedException('Sign-out is not implemented yet');
  }
}
