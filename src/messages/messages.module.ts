import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
  imports: [AuthModule],
})
export class MessagesModule {}
