import { Controller, Get, Param, Query, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import { RecommendationsService } from '../services/recommendations.service.js';
import { RecommendationContextDto } from '../dto/recommendation-context.dto.js';
import { RecommendationResponseDto } from '../dto/recommendation-response.dto.js';
import { OptionalJwtAuthGuard } from '@/common/guards/optional-jwt-auth.guard.js';

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('products')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get product recommendations' })
  @ApiOkResponse({ description: 'Product recommendations', type: RecommendationResponseDto })
  async getProducts(
    @Query() query: RecommendationContextDto,
    @Request() req: { user?: { sub?: string } | null },
  ): Promise<RecommendationResponseDto> {
    const userId = req.user?.sub ?? null;
    return this.recommendationsService.getProductRecommendations(query, userId);
  }

  @Get('stores')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get store recommendations' })
  @ApiOkResponse({ description: 'Store recommendations', type: RecommendationResponseDto })
  async getStores(
    @Query() query: RecommendationContextDto,
    @Request() req: { user?: { sub?: string } | null },
  ): Promise<RecommendationResponseDto> {
    const userId = req.user?.sub ?? null;
    return this.recommendationsService.getStoreRecommendations(query, userId);
  }

  @Get('offers')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get offer recommendations' })
  @ApiOkResponse({ description: 'Offer recommendations', type: RecommendationResponseDto })
  async getOffers(
    @Query() query: RecommendationContextDto,
    @Request() req: { user?: { sub?: string } | null },
  ): Promise<RecommendationResponseDto> {
    const userId = req.user?.sub ?? null;
    return this.recommendationsService.getOfferRecommendations(query, userId);
  }
}

@ApiTags('Product Recommendations')
@Controller('products')
export class ProductRecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get(':id/recommendations')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get similar product recommendations' })
  @ApiOkResponse({ description: 'Similar products', type: RecommendationResponseDto })
  @ApiParam({ name: 'id', description: 'Product UUID', format: 'uuid' })
  async getSimilarProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RecommendationContextDto,
    @Request() req: { user?: { sub?: string } | null },
  ): Promise<RecommendationResponseDto> {
    const userId = req.user?.sub ?? null;
    return this.recommendationsService.getSimilarProducts(id, query, userId);
  }
}

@ApiTags('Store Recommendations')
@Controller('stores')
export class StoreRecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get(':id/recommendations')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get similar store recommendations' })
  @ApiOkResponse({ description: 'Similar stores', type: RecommendationResponseDto })
  @ApiParam({ name: 'id', description: 'Store UUID', format: 'uuid' })
  async getSimilarStores(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RecommendationContextDto,
    @Request() req: { user?: { sub?: string } | null },
  ): Promise<RecommendationResponseDto> {
    const userId = req.user?.sub ?? null;
    return this.recommendationsService.getSimilarStores(id, query, userId);
  }
}
