import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { UserRole } from '@/generated/prisma/enums.js';
import { metricsRegistry } from '@/common/metrics/metrics.registry.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { QueueDepthService } from './queue-depth.service.js';

@ApiTags('Métricas Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/metrics')
export class MetricsController {
  constructor(private readonly queueDepthService: QueueDepthService) {}

  @Get()
  @ApiOperation({ summary: 'Métricas internas em memória e profundidade das filas (admin da plataforma)' })
  @ApiOkResponse({
    description: 'Instantâneo das métricas',
    schema: {
      type: 'object',
      properties: {
        metrics: { type: 'object', description: 'Contadores internos (HTTP, busca, providers, filas)' },
        queues: { type: 'object', description: 'Profundidade das filas por nome' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async getMetrics() {
    const queues = await this.queueDepthService.sample();

    return {
      metrics: metricsRegistry.snapshot(),
      queues,
    };
  }
}
