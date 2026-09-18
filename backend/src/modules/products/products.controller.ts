import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { ProductsService } from './services/products.service.js';
import { SearchIndexQueue } from '@/modules/search/queues/search-index-queue.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductResponseDto } from './dto/product-response.dto.js';
import { CategoryResponseDto } from '@/modules/categories/dto/category-response.dto.js';
import { TagResponseDto } from '@/modules/tags/dto/tag-response.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '@/common/guards/company-scope.guard.js';
import { CompanyScope } from '@/common/decorators/company-scope.decorator.js';
import { PaginationQueryDto } from '@/common/pagination/pagination-query.dto.js';
import { SuccessResponseDto } from '@/common/dto/success-response.dto.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import type { Request } from 'express';

@ApiTags('Produtos')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Company-Id', required: true, description: 'Identificador da empresa (tenant)' })
@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@CompanyScope()
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly searchIndexQueue: SearchIndexQueue,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar um novo produto' })
  @ApiCreatedResponse({ description: 'Produto criado', type: ProductResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Slug já está em uso', type: ErrorResponseDto })
  async create(
    @Body() dto: CreateProductDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.productsService.create(companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar produtos da empresa atual' })
  @ApiOkResponse({
    description: 'Produtos listados (envelope paginado: data, total, page, limit, totalPages)',
    type: ProductResponseDto,
    isArray: true,
  })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async listByCompany(
    @Query() query: PaginationQueryDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.productsService.listByCompany(companyId, query.page, query.limit);
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Obter detalhes do produto' })
  @ApiOkResponse({ description: 'Produto retornado', type: ProductResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Produto não encontrado', type: ErrorResponseDto })
  async findById(
    @Param('productId') productId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.productsService.findById(companyId, productId);
  }

  @Patch(':productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar produto' })
  @ApiOkResponse({ description: 'Produto atualizado', type: ProductResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Produto não encontrado', type: ErrorResponseDto })
  async update(
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.productsService.update(companyId, productId, dto);
  }

  @Post(':productId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desativar produto' })
  @ApiOkResponse({ description: 'Produto desativado', type: SuccessResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Produto não encontrado', type: ErrorResponseDto })
  async deactivate(
    @Param('productId') productId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    await this.productsService.deactivate(companyId, productId);
    return { success: true };
  }

  @Post(':productId/categories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Associar categorias ao produto' })
  @ApiOkResponse({ description: 'Categorias associadas', type: SuccessResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Produto não encontrado', type: ErrorResponseDto })
  @ApiBody({ schema: { type: 'object', properties: { categoryIds: { type: 'array', items: { type: 'string', format: 'uuid' } } }, required: ['categoryIds'] } })
  async addCategories(
    @Param('productId') productId: string,
    @Body('categoryIds') categoryIds: string[],
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    await this.productsService.addCategories(companyId, productId, categoryIds);
    return { success: true };
  }

  @Delete(':productId/categories/:categoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover associação de categoria do produto' })
  @ApiOkResponse({ description: 'Categoria removida', type: SuccessResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Produto ou associação não encontrado', type: ErrorResponseDto })
  async removeCategory(
    @Param('productId') productId: string,
    @Param('categoryId') categoryId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    await this.productsService.removeCategory(companyId, productId, categoryId);
    return { success: true };
  }

  @Get(':productId/categories')
  @ApiOperation({ summary: 'Listar categorias do produto' })
  @ApiOkResponse({ description: 'Categorias listadas', type: CategoryResponseDto, isArray: true })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Produto não encontrado', type: ErrorResponseDto })
  async listCategories(
    @Param('productId') productId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.productsService.listCategories(companyId, productId);
  }

  @Post(':productId/tags')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Associar tags ao produto' })
  @ApiOkResponse({ description: 'Tags associadas', type: SuccessResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Produto não encontrado', type: ErrorResponseDto })
  @ApiBody({ schema: { type: 'object', properties: { tagIds: { type: 'array', items: { type: 'string', format: 'uuid' } } }, required: ['tagIds'] } })
  async addTags(
    @Param('productId') productId: string,
    @Body('tagIds') tagIds: string[],
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    await this.productsService.addTags(companyId, productId, tagIds);
    await this.searchIndexQueue.indexProduct(productId);
    return { success: true };
  }

  @Delete(':productId/tags/:tagId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover associação de tag do produto' })
  @ApiOkResponse({ description: 'Tag removida', type: SuccessResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Produto ou associação não encontrado', type: ErrorResponseDto })
  async removeTag(
    @Param('productId') productId: string,
    @Param('tagId') tagId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    await this.productsService.removeTags(companyId, productId, [tagId]);
    await this.searchIndexQueue.indexProduct(productId);
    return { success: true };
  }

  @Get(':productId/tags')
  @ApiOperation({ summary: 'Listar tags do produto' })
  @ApiOkResponse({ description: 'Tags listadas', type: TagResponseDto, isArray: true })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Produto não encontrado', type: ErrorResponseDto })
  async listTags(
    @Param('productId') productId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.productsService.listTags(companyId, productId);
  }
}
