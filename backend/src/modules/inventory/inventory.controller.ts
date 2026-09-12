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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { InventoryService } from './services/inventory.service.js';
import { CreateInventoryDto } from './dto/create-inventory.dto.js';
import { UpdateInventoryDto } from './dto/update-inventory.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '@/common/guards/company-scope.guard.js';
import { CompanyScope } from '@/common/decorators/company-scope.decorator.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import type { Request } from 'express';

@ApiTags('Inventory')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Company-Id', required: true })
@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@CompanyScope()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List inventory for current company' })
  @ApiResponse({ status: 200, description: 'Inventory listed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
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
  @ApiOperation({ summary: 'Get inventory by product and store' })
  @ApiResponse({ status: 200, description: 'Inventory returned' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
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
  @ApiOperation({ summary: 'Create or upsert inventory record' })
  @ApiResponse({ status: 201, description: 'Inventory created' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
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
  @ApiOperation({ summary: 'Update inventory quantity' })
  @ApiResponse({ status: 200, description: 'Inventory updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
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
