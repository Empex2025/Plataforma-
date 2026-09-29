import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CompaniesService } from './services/companies.service.js';
import { CompanyResponseDto } from './dto/company-response.dto.js';
import {
  ListCompaniesQueryDto,
  UpdateCompanyStatusDto,
} from './dto/company-admin.dto.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { UserRole } from '@/generated/prisma/enums.js';

@ApiTags('Empresas Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('admin/companies')
export class AdminCompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar empresas por status (admin da plataforma)' })
  @ApiOkResponse({ description: 'Empresas listadas', type: CompanyResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async list(@Query() query: ListCompaniesQueryDto) {
    return this.companiesService.listByStatus(query.status ?? 'PENDING');
  }

  @Post(':companyId/approve')
  @ApiOperation({ summary: 'Aprovar empresa (PENDING → ACTIVE)' })
  @ApiParam({ name: 'companyId', format: 'uuid' })
  @ApiOkResponse({ description: 'Empresa aprovada', type: CompanyResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Empresa não encontrada', type: ErrorResponseDto })
  async approve(@Param('companyId') companyId: string) {
    return this.companiesService.approve(companyId);
  }

  @Post(':companyId/status')
  @ApiOperation({ summary: 'Definir status da empresa (admin da plataforma)' })
  @ApiParam({ name: 'companyId', format: 'uuid' })
  @ApiOkResponse({ description: 'Status atualizado', type: CompanyResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Empresa não encontrada', type: ErrorResponseDto })
  async setStatus(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateCompanyStatusDto,
  ) {
    return this.companiesService.setStatus(companyId, dto.status);
  }
}
