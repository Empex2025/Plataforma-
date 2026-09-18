import {
  Controller,
  Get,
  Post,
  Patch,
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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { InventoryService } from './services/inventory.service.js';
import { CreateInventoryDto } from './dto/create-inventory.dto.js';
import { UpdateInventoryDto } from './dto/update-inventory.dto.js';
import { InventoryResponseDto } from './dto/inventory-response.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '@/common/guards/company-scope.guard.js';
import { CompanyScope } from '@/common/decorators/company-scope.decorator.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import type { Request } from 'express';

@ApiTags('Estoque')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Company-Id', required: true, description: 'Identificador da empresa (tenant)' })
@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@CompanyScope()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Listar estoque da empresa atual' })
  @ApiOkResponse({ description: 'Estoque listado', type: InventoryResponseDto, isArray: true })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async listByCompany(
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
    @Query('storeId') storeId?: string,
    @Query('productId') productId?: string,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.inventoryService.listByCompany(companyId, userId, { storeId, productId });
  }

  @Get(':productId/:storeId')
  @ApiOperation({ summary: 'Obter estoque por produto e loja' })
  @ApiOkResponse({ description: 'Estoque retornado', type: InventoryResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Estoque não encontrado', type: ErrorResponseDto })
  async findByStoreAndProduct(
    @Param('productId') productId: string,
    @Param('storeId') storeId: string,
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.inventoryService.findByStoreAndProduct(companyId, userId, productId, storeId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar ou atualizar registro de estoque' })
  @ApiCreatedResponse({ description: 'Estoque criado', type: InventoryResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async upsert(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateInventoryDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.inventoryService.upsert(companyId, userId, dto);
  }

  @Patch(':productId/:storeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar quantidade em estoque' })
  @ApiOkResponse({ description: 'Estoque atualizado', type: InventoryResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Estoque não encontrado', type: ErrorResponseDto })
  async updateQuantity(
    @Param('productId') productId: string,
    @Param('storeId') storeId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateInventoryDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.inventoryService.updateQuantity(companyId, userId, productId, storeId, dto);
  }
}
