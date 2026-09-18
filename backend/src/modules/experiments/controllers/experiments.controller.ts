import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { UserRole } from '@/generated/prisma/enums.js';
import { AnalyticsQueryDto } from '@/modules/analytics/dto/analytics-query.dto.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { ExperimentsService } from '../services/experiments.service.js';
import { ExperimentMetricsService } from '../services/experiment-metrics.service.js';
import { CreateExperimentDto } from '../dto/create-experiment.dto.js';
import { UpdateExperimentDto } from '../dto/update-experiment.dto.js';
import { ExperimentResponseDto } from '../dto/experiment-response.dto.js';
import { ExperimentResultsDto } from '../dto/experiment-results.dto.js';
import { PaginationQueryDto } from '@/common/pagination/pagination-query.dto.js';

@ApiTags('Experimentos')
@ApiBearerAuth()
@Controller('experiments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class ExperimentsController {
  constructor(
    private readonly experimentsService: ExperimentsService,
    private readonly metricsService: ExperimentMetricsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar um experimento (RASCUNHO)' })
  @ApiCreatedResponse({ description: 'Experimento criado', type: ExperimentResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Conflito de dados', type: ErrorResponseDto })
  async create(@Body() dto: CreateExperimentDto): Promise<ExperimentResponseDto> {
    return this.experimentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar experimentos' })
  @ApiOkResponse({
    description: 'Experimentos listados (envelope paginado: data, total, page, limit, totalPages)',
    type: ExperimentResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async findAll(@Query() query: PaginationQueryDto) {
    return this.experimentsService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes do experimento' })
  @ApiOkResponse({ description: 'Experimento retornado', type: ExperimentResponseDto })
  @ApiParam({ name: 'id', description: 'UUID do experimento', format: 'uuid' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Recurso não encontrado', type: ErrorResponseDto })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<ExperimentResponseDto> {
    return this.experimentsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar um experimento (nome, segmentação, variantes, alocação)' })
  @ApiOkResponse({ description: 'Experimento atualizado', type: ExperimentResponseDto })
  @ApiParam({ name: 'id', description: 'UUID do experimento', format: 'uuid' })
  @ApiBadRequestResponse({ description: 'Requisição inválida', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Recurso não encontrado', type: ErrorResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExperimentDto,
  ): Promise<ExperimentResponseDto> {
    return this.experimentsService.update(id, dto);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar um experimento (valida alocação e exclusividade de domínio)' })
  @ApiOkResponse({ description: 'Experimento em execução', type: ExperimentResponseDto })
  @ApiParam({ name: 'id', description: 'UUID do experimento', format: 'uuid' })
  @ApiBadRequestResponse({ description: 'Requisição inválida', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Recurso não encontrado', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Conflito de dados', type: ErrorResponseDto })
  async start(@Param('id', ParseUUIDPipe) id: string): Promise<ExperimentResponseDto> {
    return this.experimentsService.start(id);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pausar um experimento em execução' })
  @ApiOkResponse({ description: 'Experimento pausado', type: ExperimentResponseDto })
  @ApiParam({ name: 'id', description: 'UUID do experimento', format: 'uuid' })
  @ApiBadRequestResponse({ description: 'Requisição inválida', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Recurso não encontrado', type: ErrorResponseDto })
  async pause(@Param('id', ParseUUIDPipe) id: string): Promise<ExperimentResponseDto> {
    return this.experimentsService.pause(id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Concluir um experimento (congelado)' })
  @ApiOkResponse({ description: 'Experimento concluído', type: ExperimentResponseDto })
  @ApiParam({ name: 'id', description: 'UUID do experimento', format: 'uuid' })
  @ApiBadRequestResponse({ description: 'Requisição inválida', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Recurso não encontrado', type: ErrorResponseDto })
  async complete(@Param('id', ParseUUIDPipe) id: string): Promise<ExperimentResponseDto> {
    return this.experimentsService.complete(id);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Resultados agregados do experimento (apenas métricas observadas)' })
  @ApiOkResponse({ description: 'Resultados do experimento', type: ExperimentResultsDto })
  @ApiParam({ name: 'id', description: 'UUID do experimento', format: 'uuid' })
  @ApiBadRequestResponse({ description: 'Requisição inválida', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Recurso não encontrado', type: ErrorResponseDto })
  async results(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<ExperimentResultsDto> {
    return this.metricsService.getResults(id, query);
  }
}
