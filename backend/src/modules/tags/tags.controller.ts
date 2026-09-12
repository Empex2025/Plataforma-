import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TagsService } from './services/tags.service.js';
import { CreateTagDto } from './dto/create-tag.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { UserRole } from '@/generated/prisma/enums.js';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tag (admin)' })
  @ApiResponse({ status: 201, description: 'Tag created' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  async create(@Body() dto: CreateTagDto) {
    return this.tagsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tags' })
  @ApiResponse({ status: 200, description: 'Tags listed' })
  @ApiQuery({ name: 'group', required: false, description: 'Filter by group' })
  async list(@Query('group') group?: string) {
    return this.tagsService.list(group);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get tag by slug' })
  @ApiResponse({ status: 200, description: 'Tag found' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async findBySlug(@Param('slug') slug: string) {
    return this.tagsService.findBySlug(slug);
  }
}
