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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { PriceType } from '@/generated/prisma/enums.js';
import { PricesService } from './services/prices.service.js';
import { CreatePriceDto } from './dto/create-price.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '@/common/guards/company-scope.guard.js';
import { CompanyScope } from '@/common/decorators/company-scope.decorator.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import type { Request } from 'express';

@ApiTags('Prices')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Company-Id', required: true })
@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@CompanyScope()
@Controller('prices')
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or update a price' })
  @ApiResponse({ status: 201, description: 'Price created' })
  @ApiResponse({ status: 409, description: 'Price already exists for this store, product and type' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreatePriceDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.pricesService.create(companyId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List prices with optional filters' })
  @ApiResponse({ status: 200, description: 'Prices listed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
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
  @ApiOperation({ summary: 'Get price details' })
  @ApiResponse({ status: 200, description: 'Price returned' })
  @ApiResponse({ status: 404, description: 'Price not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findById(
    @Param('priceId') priceId: string,
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.pricesService.findById(companyId, userId, priceId);
  }
}
