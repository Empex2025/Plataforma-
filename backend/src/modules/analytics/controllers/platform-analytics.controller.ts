import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { UserRole } from '@/generated/prisma/enums.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto.js';
import { AnalyticsOverviewDto } from '../dto/analytics-overview.dto.js';
import { AnalyticsTimeseriesDto } from '../dto/analytics-timeseries.dto.js';
import { AnalyticsTopEntitiesDto, AnalyticsTopCategoryDto } from '../dto/analytics-top.dto.js';
import { AnalyticsSearchDto } from '../dto/analytics-search.dto.js';
import { AnalyticsRegionsDto } from '../dto/analytics-region.dto.js';
import { AnalyticsAdvertisingDto } from '../dto/analytics-advertising.dto.js';

@ApiTags('Analytics da Plataforma')
@Controller('analytics/platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class PlatformAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Visão geral de analytics da plataforma' })
  @ApiOkResponse({ description: 'Visão geral da plataforma', type: AnalyticsOverviewDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async getOverview(@Query() query: AnalyticsQueryDto): Promise<AnalyticsOverviewDto> {
    return this.analyticsService.getPlatformOverview(query);
  }

  @Get('overview')
  @ApiOperation({ summary: 'Visão geral de analytics da plataforma (alias)' })
  @ApiOkResponse({ description: 'Visão geral da plataforma', type: AnalyticsOverviewDto })
  async getOverviewAlias(@Query() query: AnalyticsQueryDto): Promise<AnalyticsOverviewDto> {
    return this.analyticsService.getPlatformOverview(query);
  }

  @Get('timeseries')
  @ApiOperation({ summary: 'Série temporal da plataforma' })
  @ApiOkResponse({ description: 'Dados da série temporal', type: AnalyticsTimeseriesDto })
  async getTimeseries(@Query() query: AnalyticsQueryDto): Promise<AnalyticsTimeseriesDto> {
    return this.analyticsService.getPlatformTimeseries(query);
  }

  @Get('products')
  @ApiOperation({ summary: 'Produtos mais acessados da plataforma' })
  @ApiOkResponse({ description: 'Produtos mais acessados', type: AnalyticsTopEntitiesDto })
  async getProducts(@Query() query: AnalyticsQueryDto): Promise<AnalyticsTopEntitiesDto> {
    return this.analyticsService.getPlatformProducts(query);
  }

  @Get('stores')
  @ApiOperation({ summary: 'Lojas mais acessadas da plataforma' })
  @ApiOkResponse({ description: 'Lojas mais acessadas', type: AnalyticsTopEntitiesDto })
  async getStores(@Query() query: AnalyticsQueryDto): Promise<AnalyticsTopEntitiesDto> {
    return this.analyticsService.getPlatformStores(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Principais categorias da plataforma por demanda/oferta' })
  @ApiOkResponse({ description: 'Principais categorias', type: [AnalyticsTopCategoryDto] })
  async getCategories(@Query() query: AnalyticsQueryDto): Promise<AnalyticsTopCategoryDto[]> {
    return this.analyticsService.getPlatformCategories(query);
  }

  @Get('searches')
  @ApiOperation({ summary: 'Analytics de buscas da plataforma' })
  @ApiOkResponse({ description: 'Analytics de buscas', type: AnalyticsSearchDto })
  async getSearches(@Query() query: AnalyticsQueryDto): Promise<AnalyticsSearchDto> {
    return this.analyticsService.getPlatformSearches(query);
  }

  @Get('regions')
  @ApiOperation({ summary: 'Principais regiões da plataforma' })
  @ApiOkResponse({ description: 'Principais regiões', type: AnalyticsRegionsDto })
  async getRegions(@Query() query: AnalyticsQueryDto): Promise<AnalyticsRegionsDto> {
    return this.analyticsService.getPlatformRegions(query);
  }

  @Get('advertising')
  @ApiOperation({ summary: 'Analytics de publicidade da plataforma' })
  @ApiOkResponse({ description: 'Métricas de publicidade', type: AnalyticsAdvertisingDto })
  async getAdvertising(@Query() query: AnalyticsQueryDto): Promise<AnalyticsAdvertisingDto> {
    return this.analyticsService.getPlatformAdvertising(query);
  }
}
