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
import { CompanyIntelligenceDto } from './dto/company-intelligence.dto.js';
import { PlatformIntelligenceDto } from './dto/platform-intelligence.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '@/common/guards/company-scope.guard.js';
import { CompanyScope } from '@/common/decorators/company-scope.decorator.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { UserRole } from '@/generated/prisma/enums.js';

const DEFAULT_PERIOD_DAYS = 30;

@ApiTags('Intelligence')
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
      'Retorna métricas de engajamento da empresa: top produtos, top lojas e sinais heurísticos de ' +
      'Demand Gap (G1 + G3). A empresa é resolvida pelo CompanyScopeGuard a partir do vínculo do ' +
      'usuário, NÃO do companyId cru da URL (evita vazamento por manipulação de rota). ' +
      'Requer que o usuário seja membro da empresa. ' +
      '⚠️ Os sinais G1, G3 e Demand Gap são HEURÍSTICOS de oportunidade. NÃO representam ' +
      'demanda real ou comprovada. Use apenas como indicador de priorização.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa (validado pelo CompanyScopeGuard)', format: 'uuid' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data inicial (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data final (ISO 8601)' })
  @ApiOkResponse({ description: 'Dados de inteligência da empresa', type: CompanyIntelligenceDto })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiForbiddenResponse({ description: 'Usuário não pertence à empresa' })
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
    const { start, end } = this.resolvePeriod(startDate, endDate);
    return this.intelligenceService.getCompanyIntelligence(resolvedCompanyId, start, end);
  }

  @Get('platform')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Inteligência da plataforma (somente ADMIN/SUPER_ADMIN)',
    description:
      'Retorna métricas agregadas de toda a plataforma: top produtos, top lojas, top buscas, ' +
      'top empresas, sinais heurísticos globais de Demand Gap (G1 + G3) e totais gerais. ' +
      '⚠️ G1, G3 e Demand Gap NÃO representam demanda real ou comprovada.',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data inicial (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data final (ISO 8601)' })
  @ApiOkResponse({
    description: 'Dados de inteligência da plataforma',
    type: PlatformIntelligenceDto,
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiForbiddenResponse({ description: 'Requer role ADMIN ou SUPER_ADMIN' })
  async getPlatformIntelligence(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<PlatformIntelligenceDto> {
    const { start, end } = this.resolvePeriod(startDate, endDate);
    return this.intelligenceService.getPlatformIntelligence(start, end);
  }

  private resolvePeriod(startDate?: string, endDate?: string): { start: Date; end: Date } {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - DEFAULT_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    return { start, end };
  }
}
