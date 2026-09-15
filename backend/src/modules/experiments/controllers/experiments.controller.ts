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
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
import { ExperimentsService } from '../services/experiments.service.js';
import { ExperimentMetricsService } from '../services/experiment-metrics.service.js';
import { CreateExperimentDto } from '../dto/create-experiment.dto.js';
import { UpdateExperimentDto } from '../dto/update-experiment.dto.js';
import { ExperimentResponseDto } from '../dto/experiment-response.dto.js';
import { ExperimentResultsDto } from '../dto/experiment-results.dto.js';

/**
 * Admin-only experiment management API.
 *
 * There is no public management endpoint: assignment happens internally while
 * the experimental feature runs.
 */
@ApiTags('Experiments')
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
  @ApiOperation({ summary: 'Create an experiment (DRAFT)' })
  @ApiCreatedResponse({ description: 'Experiment created', type: ExperimentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires ADMIN or SUPER_ADMIN' })
  async create(@Body() dto: CreateExperimentDto): Promise<ExperimentResponseDto> {
    return this.experimentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List experiments' })
  @ApiOkResponse({ description: 'Experiments listed', type: [ExperimentResponseDto] })
  async findAll(): Promise<ExperimentResponseDto[]> {
    return this.experimentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get experiment details' })
  @ApiOkResponse({ description: 'Experiment returned', type: ExperimentResponseDto })
  @ApiParam({ name: 'id', description: 'Experiment UUID', format: 'uuid' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<ExperimentResponseDto> {
    return this.experimentsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an experiment (name, targeting, variants, allocation)' })
  @ApiOkResponse({ description: 'Experiment updated', type: ExperimentResponseDto })
  @ApiParam({ name: 'id', description: 'Experiment UUID', format: 'uuid' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExperimentDto,
  ): Promise<ExperimentResponseDto> {
    return this.experimentsService.update(id, dto);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start an experiment (validates allocation and domain exclusivity)' })
  @ApiOkResponse({ description: 'Experiment running', type: ExperimentResponseDto })
  @ApiParam({ name: 'id', description: 'Experiment UUID', format: 'uuid' })
  async start(@Param('id', ParseUUIDPipe) id: string): Promise<ExperimentResponseDto> {
    return this.experimentsService.start(id);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause a running experiment' })
  @ApiOkResponse({ description: 'Experiment paused', type: ExperimentResponseDto })
  @ApiParam({ name: 'id', description: 'Experiment UUID', format: 'uuid' })
  async pause(@Param('id', ParseUUIDPipe) id: string): Promise<ExperimentResponseDto> {
    return this.experimentsService.pause(id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete an experiment (frozen)' })
  @ApiOkResponse({ description: 'Experiment completed', type: ExperimentResponseDto })
  @ApiParam({ name: 'id', description: 'Experiment UUID', format: 'uuid' })
  async complete(@Param('id', ParseUUIDPipe) id: string): Promise<ExperimentResponseDto> {
    return this.experimentsService.complete(id);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Aggregated experiment results (observed metrics only)' })
  @ApiOkResponse({ description: 'Experiment results', type: ExperimentResultsDto })
  @ApiParam({ name: 'id', description: 'Experiment UUID', format: 'uuid' })
  async results(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<ExperimentResultsDto> {
    return this.metricsService.getResults(id, query);
  }
}
