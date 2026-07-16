import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
  imports: [AuthModule],
})
export class SessionsModule {}
