import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { RagCoreModule } from './rag-core.module';
import { RagController } from './rag.controller';

@Module({
  imports: [AuthModule, RagCoreModule],
  controllers: [RagController],
  exports: [RagCoreModule],
})
export class RagModule {}
