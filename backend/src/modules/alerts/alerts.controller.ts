import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
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
import { AlertsService } from './services/alerts.service.js';
import { CreateAlertDto } from './dto/create-alert.dto.js';
import { UpdateAlertDto } from './dto/update-alert.dto.js';
import { AlertResponseDto } from './dto/alert-response.dto.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { SuccessResponseDto } from '@/common/dto/success-response.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';

@ApiTags('Alertas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar alerta de preço/estoque' })
  @ApiCreatedResponse({ description: 'Alerta criado', type: AlertResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido', type: ErrorResponseDto })
  async create(
    @Body() dto: CreateAlertDto,
    @Request() req: { user: { sub: string } },
  ): Promise<AlertResponseDto> {
    return this.alertsService.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar alertas do usuário' })
  @ApiOkResponse({ description: 'Lista de alertas', type: [AlertResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido', type: ErrorResponseDto })
  async findAll(
    @Request() req: { user: { sub: string } },
  ): Promise<AlertResponseDto[]> {
    return this.alertsService.findAll(req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar alerta (somente próprio)' })
  @ApiParam({ name: 'id', description: 'ID do alerta', format: 'uuid' })
  @ApiOkResponse({ description: 'Alerta atualizado', type: AlertResponseDto })
  @ApiNotFoundResponse({ description: 'Alerta não encontrado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Alerta pertence a outro usuário', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido', type: ErrorResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlertDto,
    @Request() req: { user: { sub: string } },
  ): Promise<AlertResponseDto> {
    return this.alertsService.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover alerta (somente próprio)' })
  @ApiParam({ name: 'id', description: 'ID do alerta', format: 'uuid' })
  @ApiOkResponse({ description: 'Alerta removido', type: SuccessResponseDto })
  @ApiNotFoundResponse({ description: 'Alerta não encontrado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Alerta pertence a outro usuário', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido', type: ErrorResponseDto })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { sub: string } },
  ): Promise<void> {
    return this.alertsService.remove(req.user.sub, id);
  }
}
