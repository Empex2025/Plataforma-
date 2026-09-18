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
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { resolvePeriod } from './helpers/intelligence-period.js';
import { TIMESERIES_ALLOWED_GRANULARITIES } from './intelligence.constants.js';

@ApiTags('Inteligência')
@ApiBearerAuth()
@Controller('intelligence')
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}


  @Get('company/:companyId')
  @UseGuards(JwtAuthGuard, CompanyScopeGuard)
  @CompanyScope()
  @ApiOperation({
    summary: 'Inteligência da empresa (company-scoped)',
    description:
      'Retorna métricas de engajamento: principais produtos, principais lojas, contagens de engajamento e funil de contato. ' +
      'A empresa é resolvida pelo CompanyScopeGuard a partir da associação do usuário, e NÃO pelo companyId bruto da URL (evita manipulação de rota). ' +
      'Exige que o usuário seja membro da empresa.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa (validado pelo CompanyScopeGuard)', format: 'uuid' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data de início (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data de término (ISO 8601)' })
  @ApiOkResponse({ description: 'Dados de inteligência da empresa', type: CompanyIntelligenceDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async getCompanyIntelligence(
    @Req() req: { userCompany?: { company: { id: string } } },
    @Param('companyId') _companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<CompanyIntelligenceDto> {
    const resolvedCompanyId = req.userCompany?.company.id;
    if (!resolvedCompanyId) {
      throw new Error('CompanyScopeGuard não resolveu a empresa');
    }
    const { start, end } = resolvePeriod(undefined, startDate, endDate);
    return this.intelligenceService.getCompanyIntelligence(resolvedCompanyId, start, end);
  }

  @Get('company/:companyId/demand-gap')
  @UseGuards(JwtAuthGuard, CompanyScopeGuard)
  @CompanyScope()
  @ApiOperation({
    summary: 'Lacuna de demanda da empresa (sinais heurísticos G1 + G3)',
    description:
      'Retorna sinais heurísticos de oportunidade: buscas sem resultado (G1) e lacunas de demanda/oferta por categoria (G3). ' +
      'IMPORTANTE: São sinais heurísticos, NÃO uma medição definitiva de demanda. ' +
      'Não use como "demanda real" ou "demanda comprovada".',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa (validado pelo CompanyScopeGuard)', format: 'uuid' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data de início (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data de término (ISO 8601)' })
  @ApiOkResponse({ description: 'Sinais heurísticos de lacuna de demanda da empresa', type: CompanyDemandGapResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async getCompanyDemandGap(
    @Req() req: { userCompany?: { company: { id: string } } },
    @Param('companyId') _companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<CompanyDemandGapResponseDto> {
    const resolvedCompanyId = req.userCompany?.company.id;
    if (!resolvedCompanyId) {
      throw new Error('CompanyScopeGuard não resolveu a empresa');
    }
    const { start, end } = resolvePeriod(undefined, startDate, endDate);
    return this.intelligenceService.getCompanyDemandGap(resolvedCompanyId, start, end);
  }

  @Get('company/:companyId/timeseries')
  @UseGuards(JwtAuthGuard, CompanyScopeGuard)
  @CompanyScope()
  @ApiOperation({
    summary: 'Série temporal da empresa (métricas diárias/semanais)',
    description: 'Retorna métricas agrupadas por período para a empresa.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa (validado pelo CompanyScopeGuard)', format: 'uuid' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data de início (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data de término (ISO 8601)' })
  @ApiQuery({ name: 'metrics', required: false, description: 'Métricas separadas por vírgula: views,favorites,contacts,reviews' })
  @ApiQuery({ name: 'granularity', required: false, description: 'day ou week (padrão: day)' })
  @ApiOkResponse({ description: 'Dados da série temporal', type: TimeSeriesDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
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
      throw new Error('CompanyScopeGuard não resolveu a empresa');
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


  @Get('platform')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Inteligência da plataforma (somente ADMIN/SUPER_ADMIN)',
    description:
      'Retorna métricas de toda a plataforma: principais produtos, lojas, buscas, empresas, categorias e totais.',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data de início (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data de término (ISO 8601)' })
  @ApiOkResponse({ description: 'Dados de inteligência da plataforma', type: PlatformIntelligenceDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
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
    summary: 'Lacuna de demanda da plataforma (sinais heurísticos G1 + G3)',
    description:
      'Retorna sinais heurísticos de oportunidade: buscas sem resultado (G1) e lacunas de categoria (G3). ' +
      'IMPORTANTE: São sinais heurísticos, NÃO uma medição definitiva de demanda.',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data de início (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data de término (ISO 8601)' })
  @ApiOkResponse({ description: 'Sinais heurísticos de lacuna de demanda da plataforma', type: PlatformDemandGapResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
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
    summary: 'Série temporal da plataforma (métricas diárias/semanais)',
    description: 'Retorna métricas de toda a plataforma agrupadas por período.',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data de início (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data de término (ISO 8601)' })
  @ApiQuery({ name: 'metrics', required: false, description: 'Métricas separadas por vírgula: views,favorites,contacts,reviews' })
  @ApiQuery({ name: 'granularity', required: false, description: 'day ou week (padrão: day)' })
  @ApiOkResponse({ description: 'Dados da série temporal da plataforma', type: PlatformTimeSeriesDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
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
    summary: 'Principais regiões da plataforma',
    description: 'Retorna as principais regiões por engajamento (com base na cidade/estado da loja).',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data de início (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data de término (ISO 8601)' })
  @ApiOkResponse({ description: 'Principais regiões', type: [TopRegionDto] })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async getTopRegions(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<TopRegionDto[]> {
    const { start, end } = resolvePeriod(undefined, startDate, endDate);
    return this.intelligenceService.getTopRegions(start, end);
  }
}
