import { Module } from '@nestjs/common';
import { RabbitMqPublisher } from 'src/queue/sales/rabbitmq.publisher';

@Module({
  providers: [RabbitMqPublisher],
  exports: [RabbitMqPublisher],
})
export class RabbitMqModule {}
