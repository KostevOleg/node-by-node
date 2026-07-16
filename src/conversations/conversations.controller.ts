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
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ConversationsService } from './conversations.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ConversationPageResponseDto,
  ConversationResponseDto,
} from './dto/conversation-response.dto';
import { AccessTokenGuard } from 'src/auth/access-token.guard';

@ApiTags('conversations')
@UseGuards(AccessTokenGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated conversations' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Conversations page returned.',
    type: ConversationPageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters.' })
  findAll(@Query() query: PaginationDto) {
    return this.conversationsService.getConversationsPage(
      query.cursor,
      query.take,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation by id' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation returned.',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid UUID.' })
  @ApiResponse({ status: 404, description: 'Conversation not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.conversationsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create conversation' })
  @ApiResponse({
    status: 201,
    description: 'Conversation created.',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  @ApiResponse({
    status: 409,
    description: 'Conversation conflicts with existing data.',
  })
  create(@Body() dto: CreateConversationDto) {
    return this.conversationsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update conversation' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation updated.',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request body or UUID.' })
  @ApiResponse({ status: 404, description: 'Conversation not found.' })
  @ApiResponse({
    status: 409,
    description: 'Conversation conflicts with existing data.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.conversationsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete conversation' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 204, description: 'Conversation deleted.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID.' })
  @ApiResponse({ status: 404, description: 'Conversation not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.conversationsService.delete(id);
  }
}
