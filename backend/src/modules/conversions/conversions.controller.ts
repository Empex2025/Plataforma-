import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '@/common/guards/company-scope.guard.js';
import { CompanyScope } from '@/common/decorators/company-scope.decorator.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { ConversionsService } from './services/conversions.service.js';
import { CreateConversionDto } from './dto/create-conversion.dto.js';
import { QueryConversionsDto } from './dto/query-conversions.dto.js';
import { ConversionResponseDto } from './dto/conversion-response.dto.js';
import type { Request } from 'express';

@ApiTags('Conversões')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Company-Id', required: true, description: 'Identificador da empresa (tenant)' })
@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@CompanyScope()
@Controller('conversions')
export class ConversionsController {
  constructor(private readonly conversionsService: ConversionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar uma conversão/venda',
    description:
      'Registra um evento de receita. Quando `campaignId` é informado, a conversão é atribuída à ' +
      'campanha e os contadores de receita/conversão da campanha são atualizados. ' +
      'É idempotente quando `externalRef` é enviado.',
  })
  @ApiCreatedResponse({ description: 'Conversão registrada', type: ConversionResponseDto })
  @ApiBadRequestResponse({ description: 'Dados da conversão inválidos', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async register(
    @Body() dto: CreateConversionDto,
    @Req() req: Request,
  ): Promise<ConversionResponseDto> {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.conversionsService.register(companyId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar conversões da empresa atual',
    description: 'Retorna uma lista paginada de conversões da empresa do token.',
  })
  @ApiOkResponse({
    description: 'Conversões listadas (envelope paginado: data, total, page, limit, totalPages)',
    type: ConversionResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async list(
    @Query() query: QueryConversionsDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.conversionsService.list(companyId, query);
  }
}
