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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { OffersService } from './offers.service.js';
import { CreateOfferDto } from './dto/create-offer.dto.js';
import { UpdateOfferDto } from './dto/update-offer.dto.js';
import { AddProductToOfferDto } from './dto/add-product-to-offer.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '../../common/guards/company-scope.guard.js';
import { CompanyScope } from '../../common/decorators/company-scope.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { Request } from 'express';

@ApiTags('Offers')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Company-Id', required: true })
@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@CompanyScope()
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new offer' })
  @ApiResponse({ status: 201, description: 'Offer created' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateOfferDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.offersService.create(companyId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List offers for current company' })
  @ApiResponse({ status: 200, description: 'Offers listed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async listByCompany(
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.offersService.listByCompany(companyId, userId);
  }

  @Get(':offerId')
  @ApiOperation({ summary: 'Get offer details' })
  @ApiResponse({ status: 200, description: 'Offer returned' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
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
  @ApiOperation({ summary: 'Update offer' })
  @ApiResponse({ status: 200, description: 'Offer updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
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
  @ApiOperation({ summary: 'Add product to offer' })
  @ApiResponse({ status: 201, description: 'Product added to offer' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Offer or product not found' })
  @ApiResponse({ status: 409, description: 'Product already in offer' })
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
  @ApiOperation({ summary: 'Remove product from offer' })
  @ApiResponse({ status: 200, description: 'Product removed from offer' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found in offer' })
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
  @ApiOperation({ summary: 'List products in offer' })
  @ApiResponse({ status: 200, description: 'Products listed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  async listProducts(
    @Param('offerId') offerId: string,
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.offersService.listProducts(companyId, offerId, userId);
  }
}
