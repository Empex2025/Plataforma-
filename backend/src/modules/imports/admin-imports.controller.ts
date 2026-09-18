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
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { UserRole } from '@/generated/prisma/enums.js';
import {
  DEFAULT_RECONCILIATION_SAMPLE_LIMIT,
  DEFAULT_RECONCILIATION_WINDOW_DAYS,
  ImportReconciliationService,
} from './services/import-reconciliation.service.js';

@ApiTags('Importações (Admin)')
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
    summary: 'Diagnóstico de reconciliação de armazenamento (somente leitura)',
    description:
      'Compara registros de ImportJob com objetos armazenados e reporta órfãos. Nunca exclui nada.',
  })
  @ApiQuery({ name: 'sinceDays', required: false, type: Number, description: 'Janela de dias a considerar' })
  @ApiQuery({ name: 'sampleLimit', required: false, type: Number, description: 'Limite de itens na amostra' })
  @ApiQuery({ name: 'prefix', required: false, type: String, description: 'Prefixo das chaves no armazenamento' })
  @ApiOkResponse({
    description: 'Relatório de reconciliação',
    schema: {
      type: 'object',
      properties: {
        generatedAt: { type: 'string', format: 'date-time' },
        prefix: { type: 'string' },
        sinceDays: { type: 'number' },
        jobsScanned: { type: 'number' },
        objectsScanned: { type: 'number' },
        jobsMissingObject: { type: 'object', properties: { count: { type: 'number' }, sample: { type: 'array', items: { type: 'object' } } } },
        objectsMissingJob: { type: 'object', properties: { count: { type: 'number' }, sample: { type: 'array', items: { type: 'object' } } } },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
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
