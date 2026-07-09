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
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated organizations' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Organizations page returned.' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters.' })
  findAll(@Query() query: PaginationDto) {
    return this.organizationService.getOrganizationPage(
      query.cursor,
      query.take,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by id' })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, description: 'Organization returned.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID.' })
  @ApiResponse({ status: 404, description: 'Organization not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create organization' })
  @ApiResponse({ status: 201, description: 'Organization created.' })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  @ApiResponse({
    status: 409,
    description: 'Organization conflicts with existing data.',
  })
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizationService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization' })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, description: 'Organization updated.' })
  @ApiResponse({ status: 400, description: 'Invalid request body or UUID.' })
  @ApiResponse({ status: 404, description: 'Organization not found.' })
  @ApiResponse({
    status: 409,
    description: 'Organization conflicts with existing data.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization' })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 204, description: 'Organization deleted.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID.' })
  @ApiResponse({ status: 404, description: 'Organization not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.organizationService.delete(id);
  }
}
