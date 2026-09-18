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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { BrandsService } from './services/brands.service.js';
import { CreateBrandDto } from './dto/create-brand.dto.js';
import { UpdateBrandDto } from './dto/update-brand.dto.js';
import { BrandResponseDto } from './dto/brand-response.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '@/common/guards/company-scope.guard.js';
import { CompanyScope } from '@/common/decorators/company-scope.decorator.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import type { Request } from 'express';

@ApiTags('Marcas')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Company-Id', required: true, description: 'Identificador da empresa (tenant)' })
@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@CompanyScope()
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar uma nova marca' })
  @ApiCreatedResponse({ description: 'Marca criada', type: BrandResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateBrandDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.brandsService.create(companyId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar marcas da empresa atual' })
  @ApiOkResponse({ description: 'Marcas listadas', type: BrandResponseDto, isArray: true })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async listByCompany(
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.brandsService.listByCompany(companyId, userId);
  }

  @Get(':brandId')
  @ApiOperation({ summary: 'Obter detalhes da marca' })
  @ApiOkResponse({ description: 'Marca retornada', type: BrandResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Marca não encontrada', type: ErrorResponseDto })
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
  @ApiOperation({ summary: 'Atualizar marca' })
  @ApiOkResponse({ description: 'Marca atualizada', type: BrandResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Marca não encontrada', type: ErrorResponseDto })
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
