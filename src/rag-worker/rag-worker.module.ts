import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from 'src/config/env.validation';
import { ObjectStorageService } from 'src/files/storage/object-storage.service';
import { PrismaModule } from 'src/prisma/prisma-module';
import { DocumentProcessingQueueModule } from 'src/queue/document-processing/module';
import { RagProcessingModule } from 'src/rag/rag-processing.module';
import { RagAnswerConsumer } from './rag-answer.consumer';
import { RagIngestionConsumer } from './rag-ingestion.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
    }),
    DocumentProcessingQueueModule,
    PrismaModule,
    RagProcessingModule,
  ],
  providers: [RagIngestionConsumer, RagAnswerConsumer, ObjectStorageService],
})
export class RagWorkerModule {}
