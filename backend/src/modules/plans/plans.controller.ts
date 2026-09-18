import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
} from '@nestjs/swagger';
import { PlansService } from './services/plans.service.js';
import { PlanResponseDto } from './dto/plan-response.dto.js';
import { CompanyPlanResponseDto } from './dto/company-plan-response.dto.js';
import { PlanUsageResponseDto } from './dto/plan-usage-response.dto.js';
import { AssignPlanDto } from './dto/assign-plan.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { Public } from '@/common/decorators/public.decorator.js';
import { CompanyScopeGuard } from '@/common/guards/company-scope.guard.js';
import { CompanyScope } from '@/common/decorators/company-scope.decorator.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { UserRole } from '@/generated/prisma/enums.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';

@ApiTags('Planos')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar planos disponíveis (público)' })
  @ApiOkResponse({ description: 'Lista de planos ativos', type: [PlanResponseDto] })
  async findAll(): Promise<PlanResponseDto[]> {
    return this.plansService.findAllPlans();
  }

  @Get('company/:companyId')
  @UseGuards(JwtAuthGuard, CompanyScopeGuard)
  @CompanyScope()
  @ApiBearerAuth()
  @ApiParam({ name: 'companyId', description: 'ID da empresa', format: 'uuid' })
  @ApiOperation({ summary: 'Obter plano da empresa (company-scoped)' })
  @ApiOkResponse({ description: 'Plano da empresa', type: CompanyPlanResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Recurso não encontrado', type: ErrorResponseDto })
  async findCompanyPlan(@Param('companyId') companyId: string): Promise<CompanyPlanResponseDto> {
    return this.plansService.findCompanyPlan(companyId);
  }

  @Post('company/:companyId/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiParam({ name: 'companyId', description: 'ID da empresa', format: 'uuid' })
  @ApiOperation({ summary: 'Atribuir plano a empresa (somente ADMIN/SUPER_ADMIN)' })
  @ApiCreatedResponse({ description: 'Plano atribuído', type: CompanyPlanResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Recurso não encontrado', type: ErrorResponseDto })
  async assignPlan(
    @Param('companyId') companyId: string,
    @Body() dto: AssignPlanDto,
    @Request() req: { user: { role: string } },
  ): Promise<CompanyPlanResponseDto> {
    return this.plansService.assignPlan(companyId, dto.planId, req.user.role);
  }

  @Get('company/:companyId/usage')
  @UseGuards(JwtAuthGuard, CompanyScopeGuard)
  @CompanyScope()
  @ApiBearerAuth()
  @ApiParam({ name: 'companyId', description: 'ID da empresa', format: 'uuid' })
  @ApiOperation({ summary: 'Obter uso do plano da empresa (company-scoped)' })
  @ApiOkResponse({ description: 'Uso do plano', type: PlanUsageResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async getUsage(@Param('companyId') companyId: string): Promise<PlanUsageResponseDto> {
    return this.plansService.getUsage(companyId);
  }
}
