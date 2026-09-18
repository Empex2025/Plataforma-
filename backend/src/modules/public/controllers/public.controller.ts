import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator.js';
import { OptionalJwtAuthGuard } from '@/common/guards/optional-jwt-auth.guard.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { PublicProductsService } from '../services/public-products.service.js';
import { PublicStoresService } from '../services/public-stores.service.js';
import { PublicComparisonService } from '../services/public-comparison.service.js';
import { PublicProductQueryDto } from '../dto/public-product-query.dto.js';
import { PublicComparisonQueryDto } from '../dto/public-comparison-query.dto.js';
import { PublicStoreProductsQueryDto } from '../dto/public-store-products-query.dto.js';
import { PublicProductResponseDto } from '../dto/public-product-response.dto.js';
import {
  PublicStoreResponseDto,
  PublicStoreCategoriesResponseDto,
} from '../dto/public-store-response.dto.js';
import { PublicStoreProductsResponseDto } from '../dto/public-store-product-response.dto.js';
import { ProductComparisonResponseDto } from '../dto/product-comparison-response.dto.js';

@ApiTags('Público')
@UseGuards(OptionalJwtAuthGuard)
@Controller('public')
export class PublicController {
  constructor(
    private readonly publicProductsService: PublicProductsService,
    private readonly publicStoresService: PublicStoresService,
    private readonly publicComparisonService: PublicComparisonService,
  ) {}

  @Get('products/:companySlug/:productSlug')
  @Public()
  @ApiOperation({ summary: 'Detalhe público do produto por slug da empresa e do produto' })
  @ApiParam({ name: 'companySlug', description: 'Slug da empresa' })
  @ApiParam({ name: 'productSlug', description: 'Slug do produto' })
  @ApiResponse({ status: 200, type: PublicProductResponseDto })
  @ApiResponse({ status: 400, description: 'Parâmetros de consulta inválidos', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Produto não encontrado ou não público', type: ErrorResponseDto })
  async getProduct(
    @Param('companySlug') companySlug: string,
    @Param('productSlug') productSlug: string,
    @Query() query: PublicProductQueryDto,
    @Request() req: { user?: { sub?: string } },
  ): Promise<PublicProductResponseDto> {
    return this.publicProductsService.findBySlug(
      companySlug,
      productSlug,
      query,
      req.user?.sub ?? null,
    );
  }

  @Get('products/:companySlug/:productSlug/compare')
  @Public()
  @ApiOperation({ summary: 'Comparar o mesmo produto entre lojas' })
  @ApiParam({ name: 'companySlug', description: 'Slug da empresa' })
  @ApiParam({ name: 'productSlug', description: 'Slug do produto' })
  @ApiResponse({ status: 200, type: ProductComparisonResponseDto })
  @ApiResponse({ status: 400, description: 'Parâmetros de consulta inválidos', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Produto não encontrado ou não público', type: ErrorResponseDto })
  async compareProduct(
    @Param('companySlug') companySlug: string,
    @Param('productSlug') productSlug: string,
    @Query() query: PublicComparisonQueryDto,
  ): Promise<ProductComparisonResponseDto> {
    return this.publicComparisonService.compare(
      companySlug,
      productSlug,
      query,
    );
  }

  @Get('stores/:companySlug/:storeSlug')
  @Public()
  @ApiOperation({ summary: 'Detalhe público da loja por slug da empresa e da loja' })
  @ApiParam({ name: 'companySlug', description: 'Slug da empresa' })
  @ApiParam({ name: 'storeSlug', description: 'Slug da loja' })
  @ApiResponse({ status: 200, type: PublicStoreResponseDto })
  @ApiResponse({ status: 404, description: 'Loja não encontrada ou não pública', type: ErrorResponseDto })
  async getStore(
    @Param('companySlug') companySlug: string,
    @Param('storeSlug') storeSlug: string,
    @Request() req: { user?: { sub?: string } },
  ): Promise<PublicStoreResponseDto> {
    return this.publicStoresService.findBySlug(companySlug, storeSlug, req.user?.sub ?? null);
  }

  @Get('stores/:companySlug/:storeSlug/products')
  @Public()
  @ApiOperation({ summary: 'Produtos públicos vendidos por uma loja (paginado)' })
  @ApiParam({ name: 'companySlug', description: 'Slug da empresa' })
  @ApiParam({ name: 'storeSlug', description: 'Slug da loja' })
  @ApiResponse({ status: 200, type: PublicStoreProductsResponseDto })
  @ApiResponse({ status: 400, description: 'Parâmetros de consulta inválidos', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Loja não encontrada ou não pública', type: ErrorResponseDto })
  async listStoreProducts(
    @Param('companySlug') companySlug: string,
    @Param('storeSlug') storeSlug: string,
    @Query() query: PublicStoreProductsQueryDto,
  ): Promise<PublicStoreProductsResponseDto> {
    return this.publicStoresService.listProducts(companySlug, storeSlug, query);
  }

  @Get('stores/:companySlug/:storeSlug/categories')
  @Public()
  @ApiOperation({ summary: 'Categorias de produtos públicos vendidos por uma loja' })
  @ApiParam({ name: 'companySlug', description: 'Slug da empresa' })
  @ApiParam({ name: 'storeSlug', description: 'Slug da loja' })
  @ApiResponse({ status: 200, type: PublicStoreCategoriesResponseDto })
  @ApiResponse({ status: 404, description: 'Loja não encontrada ou não pública', type: ErrorResponseDto })
  async listStoreCategories(
    @Param('companySlug') companySlug: string,
    @Param('storeSlug') storeSlug: string,
  ): Promise<PublicStoreCategoriesResponseDto> {
    return this.publicStoresService.listCategories(companySlug, storeSlug);
  }
}
