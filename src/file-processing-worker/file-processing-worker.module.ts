import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from 'src/config/env.validation';
import { ObjectStorageService } from 'src/files/storage/object-storage.service';
import { PrismaModule } from 'src/prisma/prisma-module';
import { FileProcessingConsumer } from './file-processing.consumer';
import { SalesExcelParserService } from './sales-excel-parser.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
    }),
    PrismaModule,
  ],
  providers: [
    FileProcessingConsumer,
    ObjectStorageService,
    SalesExcelParserService,
  ],
})
export class FileProcessingWorkerModule {}
