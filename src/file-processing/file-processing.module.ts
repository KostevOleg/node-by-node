import { Module } from '@nestjs/common';
import { RabbitMqModule } from 'src/queue/rabbitmq.module';
import { FileProcessingProducer } from './file-processing.producer';

@Module({
  imports: [RabbitMqModule],
  providers: [FileProcessingProducer],
  exports: [FileProcessingProducer],
})
export class FileProcessingModule {}
