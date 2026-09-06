import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from 'src/config/env.validation';
import { PrismaModule } from 'src/prisma/prisma-module';
import { DocumentProcessingQueueModule } from 'src/queue/document-processing/module';
import { OutboxDispatcherService } from './outbox-dispatcher.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
    }),
    PrismaModule,
    DocumentProcessingQueueModule,
  ],
  providers: [OutboxDispatcherService],
})
export class OutboxWorkerModule {}
