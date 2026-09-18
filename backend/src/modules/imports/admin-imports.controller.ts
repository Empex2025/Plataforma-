import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { UserRole } from '@/generated/prisma/enums.js';
import {
  DEFAULT_RECONCILIATION_SAMPLE_LIMIT,
  DEFAULT_RECONCILIATION_WINDOW_DAYS,
  ImportReconciliationService,
} from './services/import-reconciliation.service.js';

@ApiTags('Admin Imports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/imports')
export class AdminImportsController {
  constructor(
    private readonly reconciliationService: ImportReconciliationService,
  ) {}

  @Get('reconciliation')
  @ApiOperation({
    summary: 'Storage reconciliation diagnostic (read-only)',
    description:
      'Compares ImportJob rows with stored objects and reports orphans. Never deletes anything.',
  })
  @ApiQuery({ name: 'sinceDays', required: false, type: Number })
  @ApiQuery({ name: 'sampleLimit', required: false, type: Number })
  @ApiQuery({ name: 'prefix', required: false, type: String })
  @ApiOkResponse({ description: 'Reconciliation report' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Not a platform admin' })
  async reconcile(
    @Query('sinceDays', new DefaultValuePipe(DEFAULT_RECONCILIATION_WINDOW_DAYS), ParseIntPipe)
    sinceDays: number,
    @Query('sampleLimit', new DefaultValuePipe(DEFAULT_RECONCILIATION_SAMPLE_LIMIT), ParseIntPipe)
    sampleLimit: number,
    @Query('prefix') prefix?: string,
  ) {
    return this.reconciliationService.reconcile({ sinceDays, sampleLimit, prefix });
  }
}
