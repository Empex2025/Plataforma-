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
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  @ApiResponse({ status: 409, description: 'Slug already in use' })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List root categories' })
  @ApiResponse({ status: 200, description: 'Categories listed' })
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':categoryId')
  @Public()
  @ApiOperation({ summary: 'Get category details' })
  @ApiResponse({ status: 200, description: 'Category returned' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findById(@Param('categoryId') categoryId: string) {
    return this.categoriesService.findById(categoryId);
  }

  @Get(':categoryId/subcategories')
  @Public()
  @ApiOperation({ summary: 'Get subcategories of a category' })
  @ApiResponse({ status: 200, description: 'Subcategories listed' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findChildren(@Param('categoryId') categoryId: string) {
    return this.categoriesService.findChildren(categoryId);
  }

  @Patch(':categoryId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Slug already in use' })
  async update(
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(categoryId, dto);
  }
}
