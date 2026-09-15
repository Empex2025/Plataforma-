import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { UserRole } from '@/generated/prisma/enums.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto.js';
import { AnalyticsOverviewDto } from '../dto/analytics-overview.dto.js';
import { AnalyticsTimeseriesDto } from '../dto/analytics-timeseries.dto.js';
import { AnalyticsTopEntitiesDto, AnalyticsTopCategoryDto } from '../dto/analytics-top.dto.js';
import { AnalyticsSearchDto } from '../dto/analytics-search.dto.js';
import { AnalyticsRegionsDto } from '../dto/analytics-region.dto.js';
import { AnalyticsAdvertisingDto } from '../dto/analytics-advertising.dto.js';

@ApiTags('Platform Analytics')
@Controller('analytics/platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class PlatformAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Platform analytics overview' })
  @ApiOkResponse({ description: 'Platform overview', type: AnalyticsOverviewDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires ADMIN or SUPER_ADMIN role' })
  async getOverview(@Query() query: AnalyticsQueryDto): Promise<AnalyticsOverviewDto> {
    return this.analyticsService.getPlatformOverview(query);
  }

  @Get('overview')
  @ApiOperation({ summary: 'Platform analytics overview (alias)' })
  @ApiOkResponse({ description: 'Platform overview', type: AnalyticsOverviewDto })
  async getOverviewAlias(@Query() query: AnalyticsQueryDto): Promise<AnalyticsOverviewDto> {
    return this.analyticsService.getPlatformOverview(query);
  }

  @Get('timeseries')
  @ApiOperation({ summary: 'Platform time series' })
  @ApiOkResponse({ description: 'Time series data', type: AnalyticsTimeseriesDto })
  async getTimeseries(@Query() query: AnalyticsQueryDto): Promise<AnalyticsTimeseriesDto> {
    return this.analyticsService.getPlatformTimeseries(query);
  }

  @Get('products')
  @ApiOperation({ summary: 'Platform top products' })
  @ApiOkResponse({ description: 'Top products', type: AnalyticsTopEntitiesDto })
  async getProducts(@Query() query: AnalyticsQueryDto): Promise<AnalyticsTopEntitiesDto> {
    return this.analyticsService.getPlatformProducts(query);
  }

  @Get('stores')
  @ApiOperation({ summary: 'Platform top stores' })
  @ApiOkResponse({ description: 'Top stores', type: AnalyticsTopEntitiesDto })
  async getStores(@Query() query: AnalyticsQueryDto): Promise<AnalyticsTopEntitiesDto> {
    return this.analyticsService.getPlatformStores(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Platform top categories by demand/supply' })
  @ApiOkResponse({ description: 'Top categories', type: [AnalyticsTopCategoryDto] })
  async getCategories(@Query() query: AnalyticsQueryDto): Promise<AnalyticsTopCategoryDto[]> {
    return this.analyticsService.getPlatformCategories(query);
  }

  @Get('searches')
  @ApiOperation({ summary: 'Platform search analytics' })
  @ApiOkResponse({ description: 'Search analytics', type: AnalyticsSearchDto })
  async getSearches(@Query() query: AnalyticsQueryDto): Promise<AnalyticsSearchDto> {
    return this.analyticsService.getPlatformSearches(query);
  }

  @Get('regions')
  @ApiOperation({ summary: 'Platform top regions' })
  @ApiOkResponse({ description: 'Top regions', type: AnalyticsRegionsDto })
  async getRegions(@Query() query: AnalyticsQueryDto): Promise<AnalyticsRegionsDto> {
    return this.analyticsService.getPlatformRegions(query);
  }

  @Get('advertising')
  @ApiOperation({ summary: 'Platform advertising analytics' })
  @ApiOkResponse({ description: 'Advertising metrics', type: AnalyticsAdvertisingDto })
  async getAdvertising(@Query() query: AnalyticsQueryDto): Promise<AnalyticsAdvertisingDto> {
    return this.analyticsService.getPlatformAdvertising(query);
  }
}
