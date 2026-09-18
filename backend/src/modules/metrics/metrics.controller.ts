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
import { QueueDepthService } from './queue-depth.service.js';

@ApiTags('Admin Metrics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/metrics')
export class MetricsController {
  constructor(private readonly queueDepthService: QueueDepthService) {}

  @Get()
  @ApiOperation({ summary: 'In-memory internal metrics and queue depths (platform admin)' })
  @ApiOkResponse({ description: 'Metrics snapshot' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Not a platform admin' })
  async getMetrics() {
    const queues = await this.queueDepthService.sample();

    return {
      metrics: metricsRegistry.snapshot(),
      queues,
    };
  }
}
