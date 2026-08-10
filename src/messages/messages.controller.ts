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
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessagesService } from './messages.service';
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
  MessagePageResponseDto,
  MessageResponseDto,
} from './dto/message-response.dto';
import { AccessTokenGuard } from 'src/auth/access-token.guard';

@ApiTags('messages')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated messages' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Messages page returned.',
    type: MessagePageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters.' })
  findAll(@Query() query: PaginationDto) {
    return this.messagesService.getMessagesPage(query.cursor, query.take);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get message by id' })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  @ApiResponse({
    status: 200,
    description: 'Message returned.',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid UUID.' })
  @ApiResponse({ status: 404, description: 'Message not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.messagesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create message' })
  @ApiResponse({
    status: 201,
    description: 'Message created.',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  @ApiResponse({
    status: 409,
    description: 'Message conflicts with existing data.',
  })
  create(@Body() dto: CreateMessageDto) {
    return this.messagesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update message' })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  @ApiResponse({
    status: 200,
    description: 'Message updated.',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request body or UUID.' })
  @ApiResponse({ status: 404, description: 'Message not found.' })
  @ApiResponse({
    status: 409,
    description: 'Message conflicts with existing data.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messagesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete message' })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  @ApiResponse({ status: 204, description: 'Message deleted.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID.' })
  @ApiResponse({ status: 404, description: 'Message not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.messagesService.delete(id);
  }
}
