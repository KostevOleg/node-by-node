import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { ObjectStorageService } from './storage/object-storage.service';
import { VirusScanService } from './virus-scan.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [FilesController],
  providers: [FilesService, ObjectStorageService, VirusScanService],
})
export class FilesModule {}
