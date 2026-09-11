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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader, ApiBody } from '@nestjs/swagger';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '../../common/guards/company-scope.guard.js';
import { CompanyScope } from '../../common/decorators/company-scope.decorator.js';
import type { Request } from 'express';

@ApiTags('Products')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Company-Id', required: true })
@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@CompanyScope()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Slug already in use' })
  async create(
    @Body() dto: CreateProductDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.productsService.create(companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List products for current company' })
  @ApiResponse({ status: 200, description: 'Products listed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async listByCompany(@Req() req: Request) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.productsService.listByCompany(companyId);
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Get product details' })
  @ApiResponse({ status: 200, description: 'Product returned' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findById(
    @Param('productId') productId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.productsService.findById(companyId, productId);
  }

  @Patch(':productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.productsService.update(companyId, productId, dto);
  }

  @Post(':productId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate product' })
  @ApiResponse({ status: 200, description: 'Product deactivated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async deactivate(
    @Param('productId') productId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    await this.productsService.deactivate(companyId, productId);
    return { success: true };
  }

  @Post(':productId/categories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Associate categories to product' })
  @ApiResponse({ status: 200, description: 'Categories associated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiBody({ schema: { type: 'object', properties: { categoryIds: { type: 'array', items: { type: 'string', format: 'uuid' } } }, required: ['categoryIds'] } })
  async addCategories(
    @Param('productId') productId: string,
    @Body('categoryIds') categoryIds: string[],
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    await this.productsService.addCategories(companyId, productId, categoryIds);
    return { success: true };
  }

  @Delete(':productId/categories/:categoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove category association from product' })
  @ApiResponse({ status: 200, description: 'Category removed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product or association not found' })
  async removeCategory(
    @Param('productId') productId: string,
    @Param('categoryId') categoryId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    await this.productsService.removeCategory(companyId, productId, categoryId);
    return { success: true };
  }

  @Get(':productId/categories')
  @ApiOperation({ summary: 'List categories for product' })
  @ApiResponse({ status: 200, description: 'Categories listed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async listCategories(
    @Param('productId') productId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.productsService.listCategories(companyId, productId);
  }
}
