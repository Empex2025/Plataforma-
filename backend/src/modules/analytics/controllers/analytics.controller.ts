import { Controller, Get, Param, Query, UseGuards, Req, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiParam, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '@/common/guards/company-scope.guard.js';
import { CompanyScope } from '@/common/decorators/company-scope.decorator.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto.js';
import { AnalyticsOverviewDto } from '../dto/analytics-overview.dto.js';
import { AnalyticsTimeseriesDto } from '../dto/analytics-timeseries.dto.js';
import { AnalyticsTopEntitiesDto } from '../dto/analytics-top.dto.js';
import { AnalyticsFunnelDto } from '../dto/analytics-funnel.dto.js';
import { AnalyticsAdvertisingDto } from '../dto/analytics-advertising.dto.js';

@ApiTags('Analytics da Empresa')
@Controller('analytics/company')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get(':companyId')
  @UseGuards(JwtAuthGuard, CompanyScopeGuard)
  @CompanyScope()
  @ApiOperation({ summary: 'Visão geral de analytics da empresa com comparação de crescimento' })
  @ApiOkResponse({ description: 'Visão geral da empresa', type: AnalyticsOverviewDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiParam({ name: 'companyId', description: 'UUID da empresa' })
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
  @ApiOperation({ summary: 'Visão geral de analytics da empresa (alias)' })
  @ApiOkResponse({ description: 'Visão geral da empresa', type: AnalyticsOverviewDto })
  @ApiParam({ name: 'companyId', description: 'UUID da empresa' })
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
  @ApiOperation({ summary: 'Série temporal da empresa' })
  @ApiOkResponse({ description: 'Dados da série temporal', type: AnalyticsTimeseriesDto })
  @ApiParam({ name: 'companyId', description: 'UUID da empresa' })
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
  @ApiOperation({ summary: 'Produtos mais acessados da empresa com crescimento' })
  @ApiOkResponse({ description: 'Produtos mais acessados', type: AnalyticsTopEntitiesDto })
  @ApiParam({ name: 'companyId', description: 'UUID da empresa' })
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
  @ApiOperation({ summary: 'Lojas mais acessadas da empresa com crescimento' })
  @ApiOkResponse({ description: 'Lojas mais acessadas', type: AnalyticsTopEntitiesDto })
  @ApiParam({ name: 'companyId', description: 'UUID da empresa' })
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
  @ApiOperation({ summary: 'Funil de conversão da empresa (heurístico)' })
  @ApiOkResponse({ description: 'Dados do funil', type: AnalyticsFunnelDto })
  @ApiParam({ name: 'companyId', description: 'UUID da empresa' })
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
  @ApiOperation({ summary: 'Analytics de publicidade da empresa' })
  @ApiOkResponse({ description: 'Métricas de publicidade', type: AnalyticsAdvertisingDto })
  @ApiParam({ name: 'companyId', description: 'UUID da empresa' })
  async getAdvertising(
    @Req() req: { userCompany?: { company: { id: string } } },
    @Param('companyId', ParseUUIDPipe) _companyId: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<AnalyticsAdvertisingDto> {
    const companyId = req.userCompany?.company.id ?? _companyId;
    return this.analyticsService.getCompanyAdvertising(companyId, query);
  }
}
