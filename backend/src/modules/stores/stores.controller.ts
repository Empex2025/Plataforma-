import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
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
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { StoresService } from './services/stores.service.js';
import { CreateStoreDto } from './dto/create-store.dto.js';
import { UpdateStoreDto } from './dto/update-store.dto.js';
import { StoreResponseDto } from './dto/store-response.dto.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { SuccessResponseDto } from '@/common/dto/success-response.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '@/common/guards/company-scope.guard.js';
import { CompanyScope } from '@/common/decorators/company-scope.decorator.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import type { Request } from 'express';

@ApiTags('Lojas')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Company-Id', required: true, description: 'Identificador da empresa (tenant)' })
@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@CompanyScope()
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar uma nova loja',
    description:
      'Cria uma loja vinculada à empresa do token. O slug é gerado automaticamente a partir ' +
      'do nome quando não informado.',
  })
  @ApiCreatedResponse({ description: 'Loja criada', type: StoreResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Conflito de dados', type: ErrorResponseDto })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateStoreDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.storesService.create(companyId, userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar lojas da empresa atual',
    description: 'Retorna as lojas da empresa do token.',
  })
  @ApiOkResponse({ description: 'Lojas listadas', type: StoreResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async listByCompany(
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.storesService.listByCompany(companyId, userId);
  }

  @Get(':storeId')
  @ApiOperation({
    summary: 'Obter detalhes da loja',
    description: 'Retorna os detalhes de uma loja da empresa do token.',
  })
  @ApiOkResponse({ description: 'Loja retornada', type: StoreResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Loja não encontrada', type: ErrorResponseDto })
  async findById(
    @Param('storeId') storeId: string,
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.storesService.findById(companyId, storeId, userId);
  }

  @Patch(':storeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atualizar loja',
    description: 'Atualiza uma loja da empresa do token.',
  })
  @ApiOkResponse({ description: 'Loja atualizada', type: StoreResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Loja não encontrada', type: ErrorResponseDto })
  async update(
    @Param('storeId') storeId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateStoreDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.storesService.update(companyId, storeId, userId, dto);
  }

  @Post(':storeId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desativar loja',
    description: 'Desativa uma loja da empresa do token.',
  })
  @ApiOkResponse({ description: 'Loja desativada', type: SuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Loja não encontrada', type: ErrorResponseDto })
  async deactivate(
    @Param('storeId') storeId: string,
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    await this.storesService.deactivate(companyId, storeId, userId);
    return { success: true };
  }
}
