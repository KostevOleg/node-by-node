import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/auth/access-token.guard';
import { RagService } from './rag.service';
import { RagIngestionStatusResponseDto } from './dto/rag-ingestion-status-response.dto';
import type { AuthenticatedRequest } from 'src/auth/types/authenticated-request';
import {
  AskRagQuestionDto,
  RagAnswerResponseDto,
} from './dto/ask-rag-question.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { RagFilePageResponseDto } from './dto/rag-file-response.dto';

@ApiTags('rag')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Get('files')
  @ApiOperation({ summary: 'Get current organization RAG files page' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'RAG files page returned.',
    type: RagFilePageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters.' })
  findAllRagFiles(
    @Req() req: AuthenticatedRequest,
    @Query() query: PaginationDto,
  ): Promise<RagFilePageResponseDto> {
    return this.ragService.getRagFilesPage(req.user, query.cursor, query.take);
  }

  @Get('files/:fileId/status')
  @ApiOperation({ summary: 'Get RAG ingestion status for a file' })
  @ApiParam({ name: 'fileId', description: 'File UUID' })
  @ApiResponse({
    status: 200,
    description: 'RAG ingestion status returned.',
    type: RagIngestionStatusResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file UUID.' })
  @ApiResponse({ status: 404, description: 'RAG ingestion job not found.' })
  getFileStatus(
    @Req() req: AuthenticatedRequest,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ): Promise<RagIngestionStatusResponseDto> {
    return this.ragService.getIngestionStatus(req.user, fileId);
  }

  @Post('files/:fileId/ask')
  @ApiOperation({ summary: 'Ask a question about an ingested RAG file' })
  @ApiParam({ name: 'fileId', description: 'File UUID' })
  @ApiResponse({
    status: 200,
    description: 'RAG answer returned.',
    type: RagAnswerResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request.' })
  @ApiResponse({
    status: 404,
    description: 'File or RAG ingestion job not found.',
  })
  async askFileQuestion(
    @Req() req: AuthenticatedRequest,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Body() dto: AskRagQuestionDto,
  ): Promise<RagAnswerResponseDto> {
    return this.ragService.answerQuestion(req.user, fileId, dto.question);
  }
}
