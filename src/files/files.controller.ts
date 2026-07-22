import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/auth/access-token.guard';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedRequest } from 'src/auth/types/authenticated-request';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { FilePageResponseDto, FileResponseDto } from './dto/files-response.dto';
import type { Response } from 'express';

@ApiTags('files')
@UseGuards(AccessTokenGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  @ApiOperation({ summary: 'Get current organization files page' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Files page returned.',
    type: FilePageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters.' })
  findAll(@Req() req: AuthenticatedRequest, @Query() query: PaginationDto) {
    return this.filesService.getFilesPage(req.user, query.cursor, query.take);
  }

  @Post()
  @ApiOperation({ summary: 'Upload current organization file' })
  @ApiResponse({
    status: 201,
    description: 'File uploaded.',
    type: FileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid upload.' })
  @ApiResponse({
    status: 409,
    description: 'File already exists in this organization.',
  })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.filesService.uploadFile(req.user, file);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download current organization file' })
  @ApiParam({ name: 'id', description: 'File UUID' })
  @ApiResponse({ status: 200, description: 'File stream returned.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID.' })
  @ApiResponse({ status: 404, description: 'File not found.' })
  @Header('Content-Disposition', 'attachment')
  async download(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { file, object } = await this.filesService.downloadFile(req.user, id);

    res.setHeader('Content-Type', object.contentType ?? file.mimeType);
    if (object.contentLength !== undefined) {
      res.setHeader('Content-Length', object.contentLength);
    }
    res.setHeader(
      'Content-Disposition',
      this.buildContentDisposition(file.originalName),
    );

    return new StreamableFile(object.body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete current organization file' })
  @ApiParam({ name: 'id', description: 'File UUID' })
  @ApiResponse({ status: 204, description: 'File deleted.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID.' })
  @ApiResponse({ status: 404, description: 'File not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.filesService.deleteFile(req.user, id);
  }

  private buildContentDisposition(fileName: string): string {
    const safeFileName = fileName.replace(/[\r\n"]/g, '_');

    return `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(
      safeFileName,
    )}`;
  }
}
