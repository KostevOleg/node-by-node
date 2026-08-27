import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from 'src/config/env.validation';
import { ObjectStorageService } from 'src/files/storage/object-storage.service';
import { PrismaModule } from 'src/prisma/prisma-module';
import { RagIngestionConsumer } from './rag-ingestion.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
    }),
    PrismaModule,
  ],
  providers: [RagIngestionConsumer, ObjectStorageService],
})
export class RagWorkerModule {}
