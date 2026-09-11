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
import { BrandsService } from './brands.service.js';
import { CreateBrandDto } from './dto/create-brand.dto.js';
import { UpdateBrandDto } from './dto/update-brand.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '../../common/guards/company-scope.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { Request } from 'express';

@ApiTags('Brands')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Company-Id', required: true })
@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new brand' })
  @ApiResponse({ status: 201, description: 'Brand created' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateBrandDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.brandsService.create(companyId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List brands for current company' })
  @ApiResponse({ status: 200, description: 'Brands listed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async listByCompany(
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.brandsService.listByCompany(companyId, userId);
  }

  @Get(':brandId')
  @ApiOperation({ summary: 'Get brand details' })
  @ApiResponse({ status: 200, description: 'Brand returned' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  async findById(
    @Param('brandId') brandId: string,
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.brandsService.findById(companyId, brandId, userId);
  }

  @Patch(':brandId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update brand' })
  @ApiResponse({ status: 200, description: 'Brand updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  async update(
    @Param('brandId') brandId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateBrandDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.brandsService.update(companyId, brandId, userId, dto);
  }
}
