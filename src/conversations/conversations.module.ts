import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { AuthModule } from 'src/auth/auth.module';
import { ConversationsResolver } from './graphql/conversations.resolver';
import { ChatMapper } from './mappers/chat.mapper';

@Module({
  providers: [ConversationsService, ConversationsResolver, ChatMapper],
  exports: [ConversationsService],
  imports: [AuthModule],
})
export class ConversationsModule {}
