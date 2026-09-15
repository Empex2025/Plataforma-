import { Controller, Get, Param, Query, UseGuards, Req, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiParam, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '@/common/guards/company-scope.guard.js';
import { CompanyScope } from '@/common/decorators/company-scope.decorator.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto.js';
import { AnalyticsOverviewDto } from '../dto/analytics-overview.dto.js';
import { AnalyticsTimeseriesDto } from '../dto/analytics-timeseries.dto.js';
import { AnalyticsTopEntitiesDto } from '../dto/analytics-top.dto.js';
import { AnalyticsFunnelDto } from '../dto/analytics-funnel.dto.js';
import { AnalyticsAdvertisingDto } from '../dto/analytics-advertising.dto.js';

@ApiTags('Company Analytics')
@Controller('analytics/company')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get(':companyId')
  @UseGuards(JwtAuthGuard, CompanyScopeGuard)
  @CompanyScope()
  @ApiOperation({ summary: 'Company analytics overview with growth comparison' })
  @ApiOkResponse({ description: 'Company overview', type: AnalyticsOverviewDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'User does not belong to this company' })
  @ApiParam({ name: 'companyId', description: 'Company UUID' })
  async getOverview(
    @Req() req: { userCompany?: { company: { id: string } } },
    @Param('companyId', ParseUUIDPipe) _companyId: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<AnalyticsOverviewDto> {
    const companyId = req.userCompany?.company.id ?? _companyId;
    return this.analyticsService.getCompanyOverview(companyId, query);
  }

  @Get(':companyId/overview')
  @UseGuards(JwtAuthGuard, CompanyScopeGuard)
  @CompanyScope()
  @ApiOperation({ summary: 'Company analytics overview (alias)' })
  @ApiOkResponse({ description: 'Company overview', type: AnalyticsOverviewDto })
  @ApiParam({ name: 'companyId', description: 'Company UUID' })
  async getOverviewAlias(
    @Req() req: { userCompany?: { company: { id: string } } },
    @Param('companyId', ParseUUIDPipe) _companyId: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<AnalyticsOverviewDto> {
    const companyId = req.userCompany?.company.id ?? _companyId;
    return this.analyticsService.getCompanyOverview(companyId, query);
  }

  @Get(':companyId/timeseries')
  @UseGuards(JwtAuthGuard, CompanyScopeGuard)
  @CompanyScope()
  @ApiOperation({ summary: 'Company time series' })
  @ApiOkResponse({ description: 'Time series data', type: AnalyticsTimeseriesDto })
  @ApiParam({ name: 'companyId', description: 'Company UUID' })
  async getTimeseries(
    @Req() req: { userCompany?: { company: { id: string } } },
    @Param('companyId', ParseUUIDPipe) _companyId: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<AnalyticsTimeseriesDto> {
    const companyId = req.userCompany?.company.id ?? _companyId;
    return this.analyticsService.getCompanyTimeseries(companyId, query);
  }

  @Get(':companyId/products')
  @UseGuards(JwtAuthGuard, CompanyScopeGuard)
  @CompanyScope()
  @ApiOperation({ summary: 'Company top products with growth' })
  @ApiOkResponse({ description: 'Top products', type: AnalyticsTopEntitiesDto })
  @ApiParam({ name: 'companyId', description: 'Company UUID' })
  async getProducts(
    @Req() req: { userCompany?: { company: { id: string } } },
    @Param('companyId', ParseUUIDPipe) _companyId: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<AnalyticsTopEntitiesDto> {
    const companyId = req.userCompany?.company.id ?? _companyId;
    return this.analyticsService.getCompanyProducts(companyId, query);
  }

  @Get(':companyId/stores')
  @UseGuards(JwtAuthGuard, CompanyScopeGuard)
  @CompanyScope()
  @ApiOperation({ summary: 'Company top stores with growth' })
  @ApiOkResponse({ description: 'Top stores', type: AnalyticsTopEntitiesDto })
  @ApiParam({ name: 'companyId', description: 'Company UUID' })
  async getStores(
    @Req() req: { userCompany?: { company: { id: string } } },
    @Param('companyId', ParseUUIDPipe) _companyId: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<AnalyticsTopEntitiesDto> {
    const companyId = req.userCompany?.company.id ?? _companyId;
    return this.analyticsService.getCompanyStores(companyId, query);
  }

  @Get(':companyId/funnel')
  @UseGuards(JwtAuthGuard, CompanyScopeGuard)
  @CompanyScope()
  @ApiOperation({ summary: 'Company conversion funnel (heuristic)' })
  @ApiOkResponse({ description: 'Funnel data', type: AnalyticsFunnelDto })
  @ApiParam({ name: 'companyId', description: 'Company UUID' })
  async getFunnel(
    @Req() req: { userCompany?: { company: { id: string } } },
    @Param('companyId', ParseUUIDPipe) _companyId: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<AnalyticsFunnelDto> {
    const companyId = req.userCompany?.company.id ?? _companyId;
    return this.analyticsService.getCompanyFunnel(companyId, query);
  }

  @Get(':companyId/advertising')
  @UseGuards(JwtAuthGuard, CompanyScopeGuard)
  @CompanyScope()
  @ApiOperation({ summary: 'Company advertising analytics' })
  @ApiOkResponse({ description: 'Advertising metrics', type: AnalyticsAdvertisingDto })
  @ApiParam({ name: 'companyId', description: 'Company UUID' })
  async getAdvertising(
    @Req() req: { userCompany?: { company: { id: string } } },
    @Param('companyId', ParseUUIDPipe) _companyId: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<AnalyticsAdvertisingDto> {
    const companyId = req.userCompany?.company.id ?? _companyId;
    return this.analyticsService.getCompanyAdvertising(companyId, query);
  }
}
