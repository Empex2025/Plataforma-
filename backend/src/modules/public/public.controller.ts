import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { PublicProductsService } from './public-products.service.js';
import { PublicStoresService } from './public-stores.service.js';
import { PublicComparisonService } from './public-comparison.service.js';
import { PublicProductQueryDto } from './dto/public-product-query.dto.js';
import { PublicComparisonQueryDto } from './dto/public-comparison-query.dto.js';
import { PublicStoreProductsQueryDto } from './dto/public-store-products-query.dto.js';
import { PublicProductResponseDto } from './dto/public-product-response.dto.js';
import {
  PublicStoreResponseDto,
  PublicStoreCategoriesResponseDto,
} from './dto/public-store-response.dto.js';
import { PublicStoreProductsResponseDto } from './dto/public-store-product-response.dto.js';
import { ProductComparisonResponseDto } from './dto/product-comparison-response.dto.js';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(
    private readonly publicProductsService: PublicProductsService,
    private readonly publicStoresService: PublicStoresService,
    private readonly publicComparisonService: PublicComparisonService,
  ) {}

  @Get('products/:companySlug/:productSlug')
  @Public()
  @ApiOperation({ summary: 'Public product detail by company and product slug' })
  @ApiParam({ name: 'companySlug', description: 'Company slug' })
  @ApiParam({ name: 'productSlug', description: 'Product slug' })
  @ApiResponse({ status: 200, type: PublicProductResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 404, description: 'Product not found or not public' })
  async getProduct(
    @Param('companySlug') companySlug: string,
    @Param('productSlug') productSlug: string,
    @Query() query: PublicProductQueryDto,
  ): Promise<PublicProductResponseDto> {
    return this.publicProductsService.findBySlug(
      companySlug,
      productSlug,
      query,
    );
  }

  @Get('products/:companySlug/:productSlug/compare')
  @Public()
  @ApiOperation({ summary: 'Compare the same product across stores' })
  @ApiParam({ name: 'companySlug', description: 'Company slug' })
  @ApiParam({ name: 'productSlug', description: 'Product slug' })
  @ApiResponse({ status: 200, type: ProductComparisonResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 404, description: 'Product not found or not public' })
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
  @ApiOperation({ summary: 'Public store detail by company and store slug' })
  @ApiParam({ name: 'companySlug', description: 'Company slug' })
  @ApiParam({ name: 'storeSlug', description: 'Store slug' })
  @ApiResponse({ status: 200, type: PublicStoreResponseDto })
  @ApiResponse({ status: 404, description: 'Store not found or not public' })
  async getStore(
    @Param('companySlug') companySlug: string,
    @Param('storeSlug') storeSlug: string,
  ): Promise<PublicStoreResponseDto> {
    return this.publicStoresService.findBySlug(companySlug, storeSlug);
  }

  @Get('stores/:companySlug/:storeSlug/products')
  @Public()
  @ApiOperation({ summary: 'Paginated public products sold by a store' })
  @ApiParam({ name: 'companySlug', description: 'Company slug' })
  @ApiParam({ name: 'storeSlug', description: 'Store slug' })
  @ApiResponse({ status: 200, type: PublicStoreProductsResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 404, description: 'Store not found or not public' })
  async listStoreProducts(
    @Param('companySlug') companySlug: string,
    @Param('storeSlug') storeSlug: string,
    @Query() query: PublicStoreProductsQueryDto,
  ): Promise<PublicStoreProductsResponseDto> {
    return this.publicStoresService.listProducts(companySlug, storeSlug, query);
  }

  @Get('stores/:companySlug/:storeSlug/categories')
  @Public()
  @ApiOperation({ summary: 'Categories of public products sold by a store' })
  @ApiParam({ name: 'companySlug', description: 'Company slug' })
  @ApiParam({ name: 'storeSlug', description: 'Store slug' })
  @ApiResponse({ status: 200, type: PublicStoreCategoriesResponseDto })
  @ApiResponse({ status: 404, description: 'Store not found or not public' })
  async listStoreCategories(
    @Param('companySlug') companySlug: string,
    @Param('storeSlug') storeSlug: string,
  ): Promise<PublicStoreCategoriesResponseDto> {
    return this.publicStoresService.listCategories(companySlug, storeSlug);
  }
}
