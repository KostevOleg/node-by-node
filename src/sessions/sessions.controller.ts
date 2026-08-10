import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { SessionsService } from './sessions.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  SessionPageResponseDto,
  SessionResponseDto,
} from './dto/session-response.dto';
import { AccessTokenGuard } from 'src/auth/access-token.guard';

@ApiTags('sessions')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated sessions' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Sessions page returned.',
    type: SessionPageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters.' })
  findAll(@Query() query: PaginationDto) {
    return this.sessionsService.getSessionsPage(query.cursor, query.take);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session by id' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({
    status: 200,
    description: 'Session returned.',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid UUID.' })
  @ApiResponse({ status: 404, description: 'Session not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sessionsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create session' })
  @ApiResponse({
    status: 201,
    description: 'Session created.',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  @ApiResponse({
    status: 409,
    description: 'Session conflicts with existing data.',
  })
  create(@Body() dto: CreateSessionDto) {
    return this.sessionsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update session' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({
    status: 200,
    description: 'Session updated.',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request body or UUID.' })
  @ApiResponse({ status: 404, description: 'Session not found.' })
  @ApiResponse({
    status: 409,
    description: 'Session conflicts with existing data.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.sessionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete session' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({ status: 204, description: 'Session deleted.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID.' })
  @ApiResponse({ status: 404, description: 'Session not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.sessionsService.delete(id);
  }
}
