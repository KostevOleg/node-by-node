import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/auth/access-token.guard';
import { FilesService } from './files.service';

@ApiTags('files')
@UseGuards(AccessTokenGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}
}
