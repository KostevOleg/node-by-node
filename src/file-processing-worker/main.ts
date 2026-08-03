import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { FileProcessingWorkerModule } from './file-processing-worker.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(FileProcessingWorkerModule);

  Logger.log('File processing worker started', 'FileProcessingWorker');
}

void bootstrap();
