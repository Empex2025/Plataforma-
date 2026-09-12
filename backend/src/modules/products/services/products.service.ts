import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { CreateProductDto } from '../dto/create-product.dto.js';
import { UpdateProductDto } from '../dto/update-product.dto.js';
import { ProductResponseDto } from '../dto/product-response.dto.js';
import { SearchIndexQueue } from '@/modules/search/queues/search-index-queue.js';
import { PlanAccessService } from '@/modules/plans/services/plan-access.service.js';
import { PlanFeature } from '@/modules/plans/plan.constants.js';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchIndexQueue: SearchIndexQueue,
    private readonly planAccess: PlanAccessService,
  ) {}

  async create(
    companyId: string,
    dto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    await this.planAccess.assertWithinLimit(companyId, PlanFeature.MAX_PRODUCTS);

    if (dto.brandId) {
      await this.validateBrand(companyId, dto.brandId);
    }

    const slug = await this.resolveSlug(dto.slug, dto.name, companyId);

    const product = await this.prisma.product.create({
      data: {
        companyId,
        name: dto.name,
        slug,
        description: dto.description ?? null,
        sku: dto.sku ?? null,
        barcode: dto.barcode ?? null,
        imageUrl: dto.imageUrl ?? null,
        brandId: dto.brandId ?? null,
        status: 'ACTIVE',
      },
    });

    await this.searchIndexQueue.indexProduct(product.id);

    return ProductResponseDto.fromPlain(product);
  }

  async findById(
    companyId: string,
    productId: string,
  ): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        companyId,
        deletedAt: null,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return ProductResponseDto.fromPlain(product);
  }

  async listByCompany(
    companyId: string,
  ): Promise<ProductResponseDto[]> {
    const products = await this.prisma.product.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    return products.map((p) => ProductResponseDto.fromPlain(p));
  }

  async update(
    companyId: string,
    productId: string,
    dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const existing = await this.prisma.product.findFirst({
      where: {
        id: productId,
        companyId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    if (dto.brandId) {
      await this.validateBrand(companyId, dto.brandId);
    }

    let slug = existing.slug;
    if (dto.name || dto.slug) {
      slug = await this.resolveSlug(
        dto.slug,
        dto.name ?? existing.name,
        companyId,
        productId,
      );
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        name: dto.name ?? existing.name,
        slug,
        description: dto.description !== undefined ? dto.description : existing.description,
        sku: dto.sku !== undefined ? dto.sku : existing.sku,
        barcode: dto.barcode !== undefined ? dto.barcode : existing.barcode,
        imageUrl: dto.imageUrl !== undefined ? dto.imageUrl : existing.imageUrl,
        brandId: dto.brandId !== undefined ? dto.brandId : existing.brandId,
        status: dto.status ?? existing.status,
      },
    });

    await this.searchIndexQueue.indexProduct(productId);

    return ProductResponseDto.fromPlain(updated);
  }

  async deactivate(
    companyId: string,
    productId: string,
  ): Promise<void> {
    const existing = await this.prisma.product.findFirst({
      where: {
        id: productId,
        companyId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        status: 'INACTIVE',
        deletedAt: new Date(),
      },
    });

    await this.searchIndexQueue.removeProduct(productId);
  }

  async addCategories(
    companyId: string,
    productId: string,
    categoryIds: string[],
  ): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        companyId,
        deletedAt: null,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!categoryIds.length) {
      throw new BadRequestException('At least one category ID is required');
    }

    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    if (categories.length !== categoryIds.length) {
      throw new BadRequestException('One or more categories were not found');
    }

    await this.prisma.productCategory.createMany({
      data: categoryIds.map((categoryId) => ({
        productId,
        categoryId,
      })),
      skipDuplicates: true,
    });
  }

  async removeCategory(
    companyId: string,
    productId: string,
    categoryId: string,
  ): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        companyId,
        deletedAt: null,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.prisma.productCategory.findUnique({
      where: {
        productId_categoryId: { productId, categoryId },
      },
    });

    if (!existing) {
      throw new NotFoundException('Category association not found');
    }

    await this.prisma.productCategory.delete({
      where: {
        productId_categoryId: { productId, categoryId },
      },
    });
  }

  async listCategories(
    companyId: string,
    productId: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        companyId,
        deletedAt: null,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const associations = await this.prisma.productCategory.findMany({
      where: { productId },
      include: { category: true },
    });

    return associations.map((a) => a.category);
  }

  async resolveSlug(
    providedSlug: string | undefined,
    name: string,
    companyId: string,
    excludeProductId?: string,
  ): Promise<string> {
    const baseSlug = providedSlug
      ? this.normalizeSlug(providedSlug)
      : this.normalizeSlug(name);

    if (!baseSlug) {
      throw new ConflictException('Could not generate a valid slug');
    }

    const existing = await this.prisma.product.findUnique({
      where: { companyId_slug: { companyId, slug: baseSlug } },
      select: { id: true },
    });

    if (!existing || (excludeProductId && existing.id === excludeProductId)) {
      return baseSlug;
    }

    if (providedSlug) {
      throw new ConflictException('Slug already in use for this company');
    }

    for (let i = 2; i <= 1000; i++) {
      const candidate = `${baseSlug}-${i}`;
      const exists = await this.prisma.product.findUnique({
        where: { companyId_slug: { companyId, slug: candidate } },
        select: { id: true },
      });
      if (!exists || (excludeProductId && exists.id === excludeProductId)) {
        return candidate;
      }
    }

    throw new ConflictException('Could not generate a unique slug');
  }

  private normalizeSlug(slug: string): string {
    return slug
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async validateBrand(companyId: string, brandId: string): Promise<void> {
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      select: { companyId: true },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    if (brand.companyId !== companyId) {
      throw new ForbiddenException('Brand does not belong to this company');
    }
  }
}
