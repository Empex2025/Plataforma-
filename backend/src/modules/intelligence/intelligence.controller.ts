import { Controller, Get, Query, Param, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { IntelligenceService } from './services/intelligence.service.js';
import {
  CompanyIntelligenceDto,
  CompanyDemandGapResponseDto,
  TimeSeriesDto,
} from './dto/company-intelligence.dto.js';
import {
  PlatformIntelligenceDto,
  PlatformDemandGapResponseDto,
  PlatformTimeSeriesDto,
  TopRegionDto,
} from './dto/platform-intelligence.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '@/common/guards/company-scope.guard.js';
import { CompanyScope } from '@/common/decorators/company-scope.decorator.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { UserRole } from '@/generated/prisma/enums.js';
import { resolvePeriod } from './helpers/intelligence-period.js';
import { TIMESERIES_ALLOWED_GRANULARITIES } from './intelligence.constants.js';

@ApiTags('Intelligence')
@ApiBearerAuth()
@Controller('intelligence')
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  // ==================== COMPANY ENDPOINTS ====================

  @Get('company/:companyId')
  @UseGuards(JwtAuthGuard, CompanyScopeGuard)
  @CompanyScope()
  @ApiOperation({
    summary: 'Company intelligence (company-scoped)',
    description:
      'Returns engagement metrics: top products, top stores, engagement counts, and contact funnel. ' +
      'The company is resolved by CompanyScopeGuard from the user membership, NOT from the raw URL companyId (prevents route manipulation). ' +
      'Requires user to be a member of the company.',
  })
  @ApiParam({ name: 'companyId', description: 'Company ID (validated by CompanyScopeGuard)', format: 'uuid' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  @ApiOkResponse({ description: 'Company intelligence data', type: CompanyIntelligenceDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'User does not belong to this company' })
  async getCompanyIntelligence(
    @Req() req: { userCompany?: { company: { id: string } } },
    @Param('companyId') _companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<CompanyIntelligenceDto> {
    const resolvedCompanyId = req.userCompany?.company.id;
    if (!resolvedCompanyId) {
      throw new Error('CompanyScopeGuard did not resolve company');
    }
    const { start, end } = resolvePeriod(undefined, startDate, endDate);
    return this.intelligenceService.getCompanyIntelligence(resolvedCompanyId, start, end);
  }

  @Get('company/:companyId/demand-gap')
  @UseGuards(JwtAuthGuard, CompanyScopeGuard)
  @CompanyScope()
  @ApiOperation({
    summary: 'Company demand gap (G1 + G3 heuristic signals)',
    description:
      'Returns heuristic opportunity signals: unmet searches (G1) and category demand/supply gaps (G3). ' +
      'IMPORTANT: These are heuristic signals, NOT definitive demand measurement. ' +
      'Do not use as "real demand" or "proven demand".',
  })
  @ApiParam({ name: 'companyId', description: 'Company ID (validated by CompanyScopeGuard)', format: 'uuid' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  @ApiOkResponse({ description: 'Company demand gap heuristic signals', type: CompanyDemandGapResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'User does not belong to this company' })
  async getCompanyDemandGap(
    @Req() req: { userCompany?: { company: { id: string } } },
    @Param('companyId') _companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<CompanyDemandGapResponseDto> {
    const resolvedCompanyId = req.userCompany?.company.id;
    if (!resolvedCompanyId) {
      throw new Error('CompanyScopeGuard did not resolve company');
    }
    const { start, end } = resolvePeriod(undefined, startDate, endDate);
    return this.intelligenceService.getCompanyDemandGap(resolvedCompanyId, start, end);
  }

  @Get('company/:companyId/timeseries')
  @UseGuards(JwtAuthGuard, CompanyScopeGuard)
  @CompanyScope()
  @ApiOperation({
    summary: 'Company time series (daily/weekly metrics)',
    description: 'Returns time-bucketed metrics for the company.',
  })
  @ApiParam({ name: 'companyId', description: 'Company ID (validated by CompanyScopeGuard)', format: 'uuid' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'metrics', required: false, description: 'Comma-separated metrics: views,favorites,contacts,reviews' })
  @ApiQuery({ name: 'granularity', required: false, description: 'day or week (default: day)' })
  @ApiOkResponse({ description: 'Time series data', type: TimeSeriesDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'User does not belong to this company' })
  async getCompanyTimeSeries(
    @Req() req: { userCompany?: { company: { id: string } } },
    @Param('companyId') _companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('metrics') metricsParam?: string,
    @Query('granularity') granularityParam?: string,
  ): Promise<TimeSeriesDto> {
    const resolvedCompanyId = req.userCompany?.company.id;
    if (!resolvedCompanyId) {
      throw new Error('CompanyScopeGuard did not resolve company');
    }
    const { start, end } = resolvePeriod(undefined, startDate, endDate);
    const metrics = metricsParam
      ? metricsParam.split(',').map((m) => m.trim()).filter(Boolean)
      : ['views', 'favorites', 'contacts', 'reviews'];
    const granularity = TIMESERIES_ALLOWED_GRANULARITIES.includes(
      granularityParam as 'day' | 'week',
    )
      ? (granularityParam as 'day' | 'week')
      : 'day';
    return this.intelligenceService.getCompanyTimeSeries(resolvedCompanyId, start, end, metrics, granularity);
  }

  // ==================== PLATFORM ENDPOINTS ====================

  @Get('platform')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Platform intelligence (ADMIN/SUPER_ADMIN only)',
    description:
      'Returns platform-wide metrics: top products, stores, searches, companies, categories, and totals.',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  @ApiOkResponse({ description: 'Platform intelligence data', type: PlatformIntelligenceDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires ADMIN or SUPER_ADMIN role' })
  async getPlatformIntelligence(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<PlatformIntelligenceDto> {
    const { start, end } = resolvePeriod(undefined, startDate, endDate);
    return this.intelligenceService.getPlatformIntelligence(start, end);
  }

  @Get('platform/demand-gap')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Platform demand gap (G1 + G3 heuristic signals)',
    description:
      'Returns heuristic opportunity signals: unmet searches (G1) and category gaps (G3). ' +
      'IMPORTANT: These are heuristic signals, NOT definitive demand measurement.',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  @ApiOkResponse({ description: 'Platform demand gap heuristic signals', type: PlatformDemandGapResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires ADMIN or SUPER_ADMIN role' })
  async getPlatformDemandGap(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<PlatformDemandGapResponseDto> {
    const { start, end } = resolvePeriod(undefined, startDate, endDate);
    return this.intelligenceService.getPlatformDemandGap(start, end);
  }

  @Get('platform/timeseries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Platform time series (daily/weekly metrics)',
    description: 'Returns time-bucketed platform-wide metrics.',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'metrics', required: false, description: 'Comma-separated metrics: views,favorites,contacts,reviews' })
  @ApiQuery({ name: 'granularity', required: false, description: 'day or week (default: day)' })
  @ApiOkResponse({ description: 'Platform time series data', type: PlatformTimeSeriesDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires ADMIN or SUPER_ADMIN role' })
  async getPlatformTimeSeries(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('metrics') metricsParam?: string,
    @Query('granularity') granularityParam?: string,
  ): Promise<PlatformTimeSeriesDto> {
    const { start, end } = resolvePeriod(undefined, startDate, endDate);
    const metrics = metricsParam
      ? metricsParam.split(',').map((m) => m.trim()).filter(Boolean)
      : ['views', 'favorites', 'contacts', 'reviews'];
    const granularity = TIMESERIES_ALLOWED_GRANULARITIES.includes(
      granularityParam as 'day' | 'week',
    )
      ? (granularityParam as 'day' | 'week')
      : 'day';
    return this.intelligenceService.getPlatformTimeSeries(start, end, metrics, granularity);
  }

  @Get('platform/regions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Platform top regions',
    description: 'Returns top regions by engagement (based on store city/state).',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  @ApiOkResponse({ description: 'Top regions', type: [TopRegionDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires ADMIN or SUPER_ADMIN role' })
  async getTopRegions(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<TopRegionDto[]> {
    const { start, end } = resolvePeriod(undefined, startDate, endDate);
    return this.intelligenceService.getTopRegions(start, end);
  }
}
