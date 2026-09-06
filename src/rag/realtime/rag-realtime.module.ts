import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { RagGateway } from './rag.gateway';
import { RagModule } from '../rag.module';
import { RagRealtimeService } from './rag-realtime.service';
import { RagStatusEventsConsumer } from './rag-status-events.consumer';

@Module({
  imports: [AuthModule, RagModule],
  providers: [RagGateway, RagRealtimeService, RagStatusEventsConsumer],
})
export class RagRealtimeModule {}
