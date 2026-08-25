import { Module } from '@nestjs/common';
import { RagRabbitMqPublisher } from './publisher';

@Module({
  providers: [RagRabbitMqPublisher],
  exports: [RagRabbitMqPublisher],
})
export class RagRabbitMqModule {}
