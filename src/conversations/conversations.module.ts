import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { AuthModule } from 'src/auth/auth.module';
import { ConversationsResolver } from './graphql/conversations.resolver';
import { ChatMapper } from './mappers/chat.mapper';
import { ChatGateway } from './websocket/chat.gateway';
import { ChatPresenceService } from './websocket/chat-presence.service';
import { ChatRealtimeService } from './websocket/chat-realtime.service';

@Module({
  providers: [
    ConversationsService,
    ConversationsResolver,
    ChatMapper,
    ChatPresenceService,
    ChatRealtimeService,
    ChatGateway,
  ],
  exports: [ConversationsService],
  imports: [AuthModule],
})
export class ConversationsModule {}
