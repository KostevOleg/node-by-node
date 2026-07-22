import { MAX_FILE_SIZE_BYTES } from '../files.constants';
import { FileInterceptor } from '@nestjs/platform-express';
export const FileUploadInterceptor = () =>
  FileInterceptor('file', {
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
      files: 1,
    },
  });
