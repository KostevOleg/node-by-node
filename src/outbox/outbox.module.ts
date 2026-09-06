import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma-module';
import { OutboxService } from './outbox.service';

@Module({
  imports: [PrismaModule],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}
