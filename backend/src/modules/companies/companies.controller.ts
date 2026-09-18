import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CompaniesService } from './services/companies.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { CompanyResponseDto } from './dto/company-response.dto.js';
import { CompanyCreatedResponseDto } from './dto/company-created-response.dto.js';
import { UserCompanyResponseDto } from './dto/user-company-response.dto.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '@/common/guards/company-scope.guard.js';
import { CompanyScope } from '@/common/decorators/company-scope.decorator.js';
import { CompanyRoleGuard } from '@/common/guards/company-role.guard.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import { RequireCompanyRole } from '@/common/decorators/company-role.decorator.js';
import { UserRole } from '@/generated/prisma/enums.js';

@ApiTags('Empresas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar uma nova empresa',
    description: 'Cria a empresa e vincula o usuário autenticado como proprietário.',
  })
  @ApiCreatedResponse({
    description: 'Empresa criada com vínculo de proprietário',
    type: CompanyCreatedResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Slug ou CNPJ já está em uso', type: ErrorResponseDto })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateCompanyDto,
  ) {
    return this.companiesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar empresas do usuário atual' })
  @ApiOkResponse({ description: 'Empresas listadas', type: UserCompanyResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  async listByUser(@CurrentUser('sub') userId: string) {
    return this.companiesService.listByUser(userId);
  }

  @Get(':companyId')
  @UseGuards(CompanyScopeGuard)
  @CompanyScope()
  @ApiOperation({ summary: 'Obter detalhes da empresa' })
  @ApiParam({ name: 'companyId', description: 'Identificador da empresa', format: 'uuid' })
  @ApiOkResponse({ description: 'Empresa retornada', type: CompanyResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Empresa não encontrada', type: ErrorResponseDto })
  async findById(
    @Param('companyId') companyId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.companiesService.findById(companyId, userId);
  }

  @Patch(':companyId')
  @UseGuards(CompanyScopeGuard, CompanyRoleGuard)
  @CompanyScope()
  @RequireCompanyRole(UserRole.MERCHANT_OWNER)
  @ApiOperation({ summary: 'Atualizar empresa' })
  @ApiParam({ name: 'companyId', description: 'Identificador da empresa', format: 'uuid' })
  @ApiOkResponse({ description: 'Empresa atualizada', type: CompanyResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Empresa não encontrada', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Slug já está em uso', type: ErrorResponseDto })
  async update(
    @Param('companyId') companyId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(companyId, userId, dto);
  }
}
