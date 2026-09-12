import { Controller, Get, Post, Query, UseGuards, Request, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service.js';
import { SearchProductsDto } from './dto/search-products.dto.js';
import { SearchStoresDto } from './dto/search-stores.dto.js';
import { AutocompleteDto } from './dto/autocomplete.dto.js';
import { SearchIndexQueue } from './search-index-queue.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';

@ApiTags('Search')
@UseGuards(OptionalJwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly searchIndexQueue: SearchIndexQueue,
  ) {}

  @Get('products')
  @ApiOperation({ summary: 'Search products' })
  @ApiResponse({ status: 200, description: 'Products found' })
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
        page: dto.page ?? 1,
        limit: dto.limit ?? 20,
      },
      req.user?.sub ?? null,
    );
  }

  @Get('stores')
  @ApiOperation({ summary: 'Search stores' })
  @ApiResponse({ status: 200, description: 'Stores found' })
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
  @ApiOperation({ summary: 'Autocomplete search' })
  @ApiResponse({ status: 200, description: 'Suggestions returned' })
  async autocomplete(@Query() dto: AutocompleteDto) {
    return this.searchService.autocomplete(dto.q, dto.type as 'product' | 'store' | 'category' | 'brand' | undefined, dto.limit);
  }

  @Post('admin/reindex')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger reindex (admin)' })
  @ApiResponse({ status: 202, description: 'Reindex job queued' })
  @ApiQuery({ name: 'type', enum: ['products', 'stores', 'all'], required: true })
  async reindex(@Query('type') type: string) {
    if (!type || !['products', 'stores', 'all'].includes(type)) {
      throw new BadRequestException('type must be "products", "stores", or "all"');
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
