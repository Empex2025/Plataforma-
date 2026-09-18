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

@ApiTags('Recomendações')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('products')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Obter recomendações de produtos' })
  @ApiOkResponse({ description: 'Recomendações de produtos', type: RecommendationResponseDto })
  async getProducts(
    @Query() query: RecommendationContextDto,
    @Request() req: { user?: { sub?: string } | null },
  ): Promise<RecommendationResponseDto> {
    const userId = req.user?.sub ?? null;
    return this.recommendationsService.getProductRecommendations(query, userId);
  }

  @Get('stores')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Obter recomendações de lojas' })
  @ApiOkResponse({ description: 'Recomendações de lojas', type: RecommendationResponseDto })
  async getStores(
    @Query() query: RecommendationContextDto,
    @Request() req: { user?: { sub?: string } | null },
  ): Promise<RecommendationResponseDto> {
    const userId = req.user?.sub ?? null;
    return this.recommendationsService.getStoreRecommendations(query, userId);
  }

  @Get('offers')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Obter recomendações de ofertas' })
  @ApiOkResponse({ description: 'Recomendações de ofertas', type: RecommendationResponseDto })
  async getOffers(
    @Query() query: RecommendationContextDto,
    @Request() req: { user?: { sub?: string } | null },
  ): Promise<RecommendationResponseDto> {
    const userId = req.user?.sub ?? null;
    return this.recommendationsService.getOfferRecommendations(query, userId);
  }
}

@ApiTags('Recomendações de Produtos')
@Controller('products')
export class ProductRecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get(':id/recommendations')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Obter recomendações de produtos semelhantes' })
  @ApiOkResponse({ description: 'Produtos semelhantes', type: RecommendationResponseDto })
  @ApiParam({ name: 'id', description: 'UUID do produto', format: 'uuid' })
  async getSimilarProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RecommendationContextDto,
    @Request() req: { user?: { sub?: string } | null },
  ): Promise<RecommendationResponseDto> {
    const userId = req.user?.sub ?? null;
    return this.recommendationsService.getSimilarProducts(id, query, userId);
  }
}

@ApiTags('Recomendações de Lojas')
@Controller('stores')
export class StoreRecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get(':id/recommendations')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Obter recomendações de lojas semelhantes' })
  @ApiOkResponse({ description: 'Lojas semelhantes', type: RecommendationResponseDto })
  @ApiParam({ name: 'id', description: 'UUID da loja', format: 'uuid' })
  async getSimilarStores(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RecommendationContextDto,
    @Request() req: { user?: { sub?: string } | null },
  ): Promise<RecommendationResponseDto> {
    const userId = req.user?.sub ?? null;
    return this.recommendationsService.getSimilarStores(id, query, userId);
  }
}
