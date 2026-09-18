import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
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
import { CampaignsService } from '../services/campaigns.service.js';
import { CreateCampaignDto } from '../dto/create-campaign.dto.js';
import { UpdateCampaignDto } from '../dto/update-campaign.dto.js';
import { CampaignResponseDto } from '../dto/campaign-response.dto.js';
import { CampaignMetricsDto } from '../dto/campaign-metrics.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '@/common/guards/company-scope.guard.js';
import { CompanyScope } from '@/common/decorators/company-scope.decorator.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { PaginationQueryDto } from '@/common/pagination/pagination-query.dto.js';

@ApiTags('Publicidade')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@Controller('advertising')
export class AdvertisingController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post('campaigns')
  @CompanyScope()
  @ApiOperation({ summary: 'Criar uma nova campanha' })
  @ApiCreatedResponse({ description: 'Campanha criada', type: CampaignResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async create(
    @Request() req: { userCompany?: { company: { id: string } } },
    @Body() dto: CreateCampaignDto,
  ): Promise<CampaignResponseDto> {
    const companyId = req.userCompany!.company.id;
    return this.campaignsService.create(companyId, dto);
  }

  @Get('campaigns')
  @CompanyScope()
  @ApiOperation({ summary: 'Listar campanhas da empresa' })
  @ApiOkResponse({
    description: 'Lista de campanhas (envelope paginado: data, total, page, limit, totalPages)',
    type: CampaignResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async findAll(
    @Request() req: { userCompany?: { company: { id: string } } },
    @Query() query: PaginationQueryDto,
  ) {
    const companyId = req.userCompany!.company.id;
    return this.campaignsService.findAll(companyId, query.page, query.limit);
  }

  @Get('campaigns/:id')
  @CompanyScope()
  @ApiOperation({ summary: 'Obter detalhes da campanha' })
  @ApiOkResponse({ description: 'Detalhes da campanha', type: CampaignResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Recurso não encontrado', type: ErrorResponseDto })
  @ApiParam({ name: 'id', description: 'ID da campanha', format: 'uuid' })
  async findById(
    @Request() req: { userCompany?: { company: { id: string } } },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CampaignResponseDto> {
    const companyId = req.userCompany!.company.id;
    return this.campaignsService.findById(companyId, id);
  }

  @Patch('campaigns/:id')
  @CompanyScope()
  @ApiOperation({ summary: 'Atualizar uma campanha' })
  @ApiOkResponse({ description: 'Campanha atualizada', type: CampaignResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Recurso não encontrado', type: ErrorResponseDto })
  @ApiParam({ name: 'id', description: 'ID da campanha', format: 'uuid' })
  async update(
    @Request() req: { userCompany?: { company: { id: string } } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
  ): Promise<CampaignResponseDto> {
    const companyId = req.userCompany!.company.id;
    return this.campaignsService.update(companyId, id, dto);
  }

  @Post('campaigns/:id/activate')
  @HttpCode(HttpStatus.OK)
  @CompanyScope()
  @ApiOperation({ summary: 'Ativar uma campanha' })
  @ApiOkResponse({ description: 'Campanha ativada', type: CampaignResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Recurso não encontrado', type: ErrorResponseDto })
  @ApiParam({ name: 'id', description: 'ID da campanha', format: 'uuid' })
  async activate(
    @Request() req: { userCompany?: { company: { id: string } } },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CampaignResponseDto> {
    const companyId = req.userCompany!.company.id;
    return this.campaignsService.activate(companyId, id);
  }

  @Post('campaigns/:id/pause')
  @HttpCode(HttpStatus.OK)
  @CompanyScope()
  @ApiOperation({ summary: 'Pausar uma campanha' })
  @ApiOkResponse({ description: 'Campanha pausada', type: CampaignResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Recurso não encontrado', type: ErrorResponseDto })
  @ApiParam({ name: 'id', description: 'ID da campanha', format: 'uuid' })
  async pause(
    @Request() req: { userCompany?: { company: { id: string } } },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CampaignResponseDto> {
    const companyId = req.userCompany!.company.id;
    return this.campaignsService.pause(companyId, id);
  }

  @Get('campaigns/:id/metrics')
  @CompanyScope()
  @ApiOperation({ summary: 'Obter métricas da campanha' })
  @ApiOkResponse({ description: 'Métricas da campanha', type: CampaignMetricsDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Recurso não encontrado', type: ErrorResponseDto })
  @ApiParam({ name: 'id', description: 'ID da campanha', format: 'uuid' })
  async getMetrics(
    @Request() req: { userCompany?: { company: { id: string } } },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CampaignMetricsDto> {
    const companyId = req.userCompany!.company.id;
    return this.campaignsService.getMetrics(companyId, id);
  }
}
