import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { ObjectStorageService } from './storage/object-storage.service';
import { VirusScanService } from './virus-scan.service';
import { AuthModule } from 'src/auth/auth.module';
import { FileProcessingModule } from 'src/file-processing/file-processing.module';
import { RagModule } from 'src/rag/rag.module';

@Module({
  imports: [AuthModule, FileProcessingModule, RagModule],
  controllers: [FilesController],
  providers: [FilesService, ObjectStorageService, VirusScanService],
})
export class FilesModule {}
