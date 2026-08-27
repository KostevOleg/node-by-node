import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { RagWorkerModule } from './rag-worker.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(RagWorkerModule);

  Logger.log('Rag worker started', 'RagWorker');
}

void bootstrap();
