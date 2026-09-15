import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService, type ReadinessResult } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('live')
  liveness(): { status: 'ok' } {
    return this.health.liveness();
  }

  @Get('ready')
  async readiness(@Res({ passthrough: true }) res: Response): Promise<ReadinessResult> {
    const result = await this.health.readiness();
    res.status(result.status === 'unavailable' ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK);
    return result;
  }
}
