import { Module } from '@nestjs/common';
import { OutboxModule } from 'src/outbox/outbox.module';
import { RagAnswerRpcClient } from './answering/rag-answer-rpc.client';
import { RagIngestionProducer } from './ingestion/rag-ingestion.producer';
import { RagService } from './rag.service';

@Module({
  imports: [OutboxModule],
  providers: [RagService, RagAnswerRpcClient, RagIngestionProducer],
  exports: [RagService, RagAnswerRpcClient, RagIngestionProducer],
})
export class RagCoreModule {}
