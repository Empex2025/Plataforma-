import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { TagsService } from './services/tags.service.js';
import { CreateTagDto } from './dto/create-tag.dto.js';
import { TagResponseDto } from './dto/tag-response.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
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
  @ApiOperation({ summary: 'Criar uma nova tag (admin)' })
  @ApiCreatedResponse({ description: 'Tag criada', type: TagResponseDto })
  @ApiConflictResponse({ description: 'Slug já existe', type: ErrorResponseDto })
  async create(@Body() dto: CreateTagDto) {
    return this.tagsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar tags' })
  @ApiOkResponse({ description: 'Tags listadas', type: TagResponseDto, isArray: true })
  @ApiQuery({ name: 'group', required: false, description: 'Filtrar por grupo' })
  async list(@Query('group') group?: string) {
    return this.tagsService.list(group);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Obter tag por slug' })
  @ApiOkResponse({ description: 'Tag encontrada', type: TagResponseDto })
  @ApiNotFoundResponse({ description: 'Tag não encontrada', type: ErrorResponseDto })
  async findBySlug(@Param('slug') slug: string) {
    return this.tagsService.findBySlug(slug);
  }
}
