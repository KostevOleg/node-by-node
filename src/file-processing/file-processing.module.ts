import { Module } from '@nestjs/common';
import { OutboxModule } from 'src/outbox/outbox.module';
import { PrismaModule } from 'src/prisma/prisma-module';
import { FileProcessingProducer } from './file-processing.producer';

@Module({
  imports: [OutboxModule, PrismaModule],
  providers: [FileProcessingProducer],
  exports: [FileProcessingProducer],
})
export class FileProcessingModule {}
