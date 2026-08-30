import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from 'src/config/env.validation';
import { ObjectStorageService } from 'src/files/storage/object-storage.service';
import { PrismaModule } from 'src/prisma/prisma-module';
import { RagModule } from 'src/rag/rag.module';
import { RagIngestionConsumer } from './rag-ingestion.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
    }),
    PrismaModule,
    RagModule,
  ],
  providers: [RagIngestionConsumer, ObjectStorageService],
})
export class RagWorkerModule {}
