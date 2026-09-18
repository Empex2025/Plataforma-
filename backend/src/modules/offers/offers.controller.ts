import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { OffersService } from './services/offers.service.js';
import { CreateOfferDto } from './dto/create-offer.dto.js';
import { UpdateOfferDto } from './dto/update-offer.dto.js';
import { AddProductToOfferDto } from './dto/add-product-to-offer.dto.js';
import { OfferResponseDto } from './dto/offer-response.dto.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { SuccessResponseDto } from '@/common/dto/success-response.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '@/common/guards/company-scope.guard.js';
import { CompanyScope } from '@/common/decorators/company-scope.decorator.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import type { Request } from 'express';

@ApiTags('Ofertas')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Company-Id', required: true, description: 'Identificador da empresa (tenant)' })
@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@CompanyScope()
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar uma nova oferta',
    description:
      'Cria uma oferta vinculada à empresa do token. Quando `storeId` é informado, a loja precisa ' +
      'pertencer à mesma empresa.',
  })
  @ApiCreatedResponse({ description: 'Oferta criada', type: OfferResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateOfferDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.offersService.create(companyId, userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar ofertas da empresa atual',
    description: 'Retorna as ofertas da empresa do token.',
  })
  @ApiOkResponse({ description: 'Ofertas listadas', type: OfferResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async listByCompany(
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.offersService.listByCompany(companyId, userId);
  }

  @Get(':offerId')
  @ApiOperation({
    summary: 'Obter detalhes da oferta',
    description: 'Retorna os detalhes de uma oferta da empresa do token.',
  })
  @ApiOkResponse({ description: 'Oferta retornada', type: OfferResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Oferta não encontrada', type: ErrorResponseDto })
  async findById(
    @Param('offerId') offerId: string,
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.offersService.findById(companyId, offerId, userId);
  }

  @Patch(':offerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atualizar oferta',
    description: 'Atualiza uma oferta da empresa do token.',
  })
  @ApiOkResponse({ description: 'Oferta atualizada', type: OfferResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Oferta não encontrada', type: ErrorResponseDto })
  async update(
    @Param('offerId') offerId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateOfferDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.offersService.update(companyId, offerId, userId, dto);
  }

  @Post(':offerId/products')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Adicionar produto à oferta',
    description: 'Vincula um produto da empresa a uma oferta existente.',
  })
  @ApiCreatedResponse({ description: 'Produto adicionado à oferta', type: SuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Oferta ou produto não encontrado', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Produto já adicionado à oferta', type: ErrorResponseDto })
  async addProduct(
    @Param('offerId') offerId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: AddProductToOfferDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    await this.offersService.addProduct(companyId, userId, offerId, dto);
    return { success: true };
  }

  @Delete(':offerId/products/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remover produto da oferta',
    description: 'Desvincula um produto de uma oferta existente.',
  })
  @ApiOkResponse({ description: 'Produto removido da oferta', type: SuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Produto não encontrado na oferta', type: ErrorResponseDto })
  async removeProduct(
    @Param('offerId') offerId: string,
    @Param('productId') productId: string,
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    await this.offersService.removeProduct(companyId, userId, offerId, productId);
    return { success: true };
  }

  @Get(':offerId/products')
  @ApiOperation({
    summary: 'Listar produtos da oferta',
    description: 'Retorna os produtos vinculados a uma oferta da empresa do token.',
  })
  @ApiOkResponse({ description: 'Produtos listados', schema: { type: 'array', items: { type: 'object' } } })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Oferta não encontrada', type: ErrorResponseDto })
  async listProducts(
    @Param('offerId') offerId: string,
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.offersService.listProducts(companyId, offerId, userId);
  }
}
