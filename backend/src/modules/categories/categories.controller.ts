import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { CategoriesService } from './services/categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CategoryResponseDto } from './dto/category-response.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { Public } from '@/common/decorators/public.decorator.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { UserRole } from '@/generated/prisma/enums.js';

@ApiTags('Categorias')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar uma nova categoria' })
  @ApiCreatedResponse({ description: 'Categoria criada', type: CategoryResponseDto })
  @ApiConflictResponse({ description: 'Slug já está em uso', type: ErrorResponseDto })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar categorias raiz' })
  @ApiOkResponse({ description: 'Categorias listadas', type: CategoryResponseDto, isArray: true })
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':categoryId')
  @Public()
  @ApiOperation({ summary: 'Obter detalhes da categoria' })
  @ApiOkResponse({ description: 'Categoria retornada', type: CategoryResponseDto })
  @ApiNotFoundResponse({ description: 'Categoria não encontrada', type: ErrorResponseDto })
  async findById(@Param('categoryId') categoryId: string) {
    return this.categoriesService.findById(categoryId);
  }

  @Get(':categoryId/subcategories')
  @Public()
  @ApiOperation({ summary: 'Obter subcategorias de uma categoria' })
  @ApiOkResponse({ description: 'Subcategorias listadas', type: CategoryResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Categoria não encontrada', type: ErrorResponseDto })
  async findChildren(@Param('categoryId') categoryId: string) {
    return this.categoriesService.findChildren(categoryId);
  }

  @Patch(':categoryId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar categoria' })
  @ApiOkResponse({ description: 'Categoria atualizada', type: CategoryResponseDto })
  @ApiNotFoundResponse({ description: 'Categoria não encontrada', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Slug já está em uso', type: ErrorResponseDto })
  async update(
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(categoryId, dto);
  }
}
