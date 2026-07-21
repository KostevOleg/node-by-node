import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { ObjectStorageService } from './storage/object-storage.service';

@Module({
  controllers: [FilesController],
  providers: [FilesService, ObjectStorageService],
})
export class FilesModule {}
