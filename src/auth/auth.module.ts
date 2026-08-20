import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from './access-token.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphqlAccessTokenGuard } from './graphql-access-token.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AccessTokenGuard, GraphqlAccessTokenGuard],
  exports: [AuthService, AccessTokenGuard, JwtModule, GraphqlAccessTokenGuard],
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
})
export class AuthModule {}
