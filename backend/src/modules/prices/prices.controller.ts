import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
  ApiQuery,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { PriceType } from '@/generated/prisma/enums.js';
import { PricesService } from './services/prices.service.js';
import { CreatePriceDto } from './dto/create-price.dto.js';
import { PriceResponseDto } from './dto/price-response.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '@/common/guards/company-scope.guard.js';
import { CompanyScope } from '@/common/decorators/company-scope.decorator.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import type { Request } from 'express';

@ApiTags('Preços')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Company-Id', required: true, description: 'Identificador da empresa (tenant)' })
@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@CompanyScope()
@Controller('prices')
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar ou atualizar um preço' })
  @ApiCreatedResponse({ description: 'Preço criado', type: PriceResponseDto })
  @ApiConflictResponse({ description: 'Já existe um preço para esta loja, produto e tipo', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreatePriceDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.pricesService.create(companyId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar preços com filtros opcionais' })
  @ApiOkResponse({ description: 'Preços listados', type: PriceResponseDto, isArray: true })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiQuery({ name: 'storeId', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: PriceType })
  async list(
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
    @Query('storeId') storeId?: string,
    @Query('productId') productId?: string,
    @Query('type') type?: PriceType,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.pricesService.list(companyId, userId, { storeId, productId, type });
  }

  @Get(':priceId')
  @ApiOperation({ summary: 'Obter detalhes do preço' })
  @ApiOkResponse({ description: 'Preço retornado', type: PriceResponseDto })
  @ApiNotFoundResponse({ description: 'Preço não encontrado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async findById(
    @Param('priceId') priceId: string,
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.pricesService.findById(companyId, userId, priceId);
  }
}
