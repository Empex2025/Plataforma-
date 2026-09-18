import { Controller, Get, Post, Query, UseGuards, Request, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { SearchService } from '../services/search.service.js';
import { SearchProductsDto } from '../dto/search-products.dto.js';
import { SearchStoresDto } from '../dto/search-stores.dto.js';
import { AutocompleteDto } from '../dto/autocomplete.dto.js';
import { SearchIndexQueue } from '../queues/search-index-queue.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '@/common/guards/optional-jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { RateLimit } from '@/common/rate-limit/rate-limit.decorator.js';
import { STRICT_RATE_LIMITS } from '@/common/rate-limit/rate-limit.constants.js';
import { UserRole } from '@/generated/prisma/enums.js';

@ApiTags('Busca')
@UseGuards(OptionalJwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly searchIndexQueue: SearchIndexQueue,
  ) {}

  @Get('products')
  @RateLimit(STRICT_RATE_LIMITS.search)
  @ApiOperation({ summary: 'Buscar produtos' })
  @ApiOkResponse({
    description: 'Produtos encontrados',
    schema: {
      type: 'object',
      properties: {
        hits: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async searchProducts(@Query() dto: SearchProductsDto, @Request() req: { user?: { sub?: string } }) {
    return this.searchService.searchProducts(
      {
        term: dto.q,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        storeId: dto.storeId,
        city: dto.city,
        state: dto.state,
        inStock: dto.inStock,
        minPrice: dto.minPrice,
        maxPrice: dto.maxPrice,
        lat: dto.lat,
        lng: dto.lng,
        radius: dto.radius,
        sort: dto.sort,
        tagSlug: dto.tagSlug,
        page: dto.page ?? 1,
        limit: dto.limit ?? 20,
      },
      req.user?.sub ?? null,
    );
  }

  @Get('stores')
  @RateLimit(STRICT_RATE_LIMITS.search)
  @ApiOperation({ summary: 'Buscar lojas' })
  @ApiOkResponse({
    description: 'Lojas encontradas',
    schema: {
      type: 'object',
      properties: {
        hits: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async searchStores(@Query() dto: SearchStoresDto, @Request() req: { user?: { sub?: string } }) {
    return this.searchService.searchStores(
      {
        term: dto.q,
        city: dto.city,
        state: dto.state,
        category: dto.category,
        lat: dto.lat,
        lng: dto.lng,
        radius: dto.radius,
        sort: dto.sort,
        page: dto.page ?? 1,
        limit: dto.limit ?? 20,
      },
      req.user?.sub ?? null,
    );
  }

  @Get('autocomplete')
  @RateLimit(STRICT_RATE_LIMITS.search)
  @ApiOperation({ summary: 'Busca com autocomplete' })
  @ApiOkResponse({ description: 'Sugestões retornadas', schema: { type: 'array', items: { type: 'object' } } })
  async autocomplete(@Query() dto: AutocompleteDto) {
    return this.searchService.autocomplete(dto.q, dto.type as 'product' | 'store' | 'category' | 'brand' | undefined, dto.limit);
  }

  @Post('admin/reindex')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Disparar reindexação (admin)' })
  @ApiResponse({
    status: 202,
    description: 'Trabalho de reindexação enfileirado',
    schema: { type: 'object', properties: { jobIds: { type: 'array', items: { type: 'string' } } } },
  })
  @ApiQuery({ name: 'type', enum: ['products', 'stores', 'all'], required: true, description: 'Tipo de reindexação' })
  async reindex(@Query('type') type: string) {
    if (!type || !['products', 'stores', 'all'].includes(type)) {
      throw new BadRequestException('type deve ser "products", "stores" ou "all"');
    }

    const jobIds: string[] = [];

    if (type === 'products' || type === 'all') {
      jobIds.push(await this.searchIndexQueue.reindexAllProducts());
    }
    if (type === 'stores' || type === 'all') {
      jobIds.push(await this.searchIndexQueue.reindexAllStores());
    }

    return { jobIds };
  }
}
