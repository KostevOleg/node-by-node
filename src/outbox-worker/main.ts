import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { OutboxWorkerModule } from './outbox-worker.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(OutboxWorkerModule);
  Logger.log('Outbox worker started', 'OutboxWorker');
}

void bootstrap();
