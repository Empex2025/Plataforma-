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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { StoresService } from './stores.service.js';
import { CreateStoreDto } from './dto/create-store.dto.js';
import { UpdateStoreDto } from './dto/update-store.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '../../common/guards/company-scope.guard.js';
import { CompanyScope } from '../../common/decorators/company-scope.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { Request } from 'express';

@ApiTags('Stores')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Company-Id', required: true })
@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@CompanyScope()
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new store' })
  @ApiResponse({ status: 201, description: 'Store created' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateStoreDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.storesService.create(companyId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List stores for current company' })
  @ApiResponse({ status: 200, description: 'Stores listed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async listByCompany(
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.storesService.listByCompany(companyId, userId);
  }

  @Get(':storeId')
  @ApiOperation({ summary: 'Get store details' })
  @ApiResponse({ status: 200, description: 'Store returned' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Store not found' })
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
  @ApiOperation({ summary: 'Update store' })
  @ApiResponse({ status: 200, description: 'Store updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Store not found' })
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
  @ApiOperation({ summary: 'Deactivate store' })
  @ApiResponse({ status: 200, description: 'Store deactivated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Store not found' })
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
