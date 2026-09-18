import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { CreateProductDto } from '../dto/create-product.dto.js';
import { UpdateProductDto } from '../dto/update-product.dto.js';
import { ProductResponseDto } from '../dto/product-response.dto.js';
import { SearchIndexQueue } from '@/modules/search/queues/search-index-queue.js';
import { PlanAccessService } from '@/modules/plans/services/plan-access.service.js';
import { PlanFeature } from '@/modules/plans/plan.constants.js';
import { TagsService } from '@/modules/tags/services/tags.service.js';
import { EmbeddingQueue } from '@/modules/ai/queues/embedding.queue.js';
import {
  buildSlugLookupWhere,
  resolveUniqueSlug,
} from '@/common/helpers/slug.util.js';
import {
  buildPaginatedResult,
  normalizePagination,
  type PaginatedResult,
} from '@/common/pagination/pagination.constants.js';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly searchIndexQueue: SearchIndexQueue,
    private readonly planAccess: PlanAccessService,
    private readonly tagsService: TagsService,
    @Optional() private readonly embeddingQueue?: EmbeddingQueue,
  ) {}

  private enqueueEmbedding(productId: string): void {
    if (!this.embeddingQueue) return;
    void this.embeddingQueue
      .enqueueEntity('product', productId)
      .catch((error) => this.logger.warn(`Failed to enqueue product embedding: ${(error as Error).message}`));
  }

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

    if (dto.tagIds?.length) {
      await this.addTags(companyId, product.id, dto.tagIds);
    }

    await this.searchIndexQueue.indexProduct(product.id);

    this.enqueueEmbedding(product.id);

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
      throw new NotFoundException('Produto não encontrado');
    }

    return ProductResponseDto.fromPlain(product);
  }

  async listByCompany(
    companyId: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResult<ProductResponseDto>> {
    const { page: safePage, limit: safeLimit, skip } = normalizePagination(
      page,
      limit,
    );

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          companyId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.product.count({
        where: {
          companyId,
          deletedAt: null,
        },
      }),
    ]);

    return buildPaginatedResult(
      products.map((p) => ProductResponseDto.fromPlain(p)),
      total,
      safePage,
      safeLimit,
    );
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
      throw new NotFoundException('Produto não encontrado');
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

    if (dto.tagIds !== undefined) {
      await this.replaceAllTags(companyId, productId, dto.tagIds);
    }

    await this.searchIndexQueue.indexProduct(productId);

    this.enqueueEmbedding(productId);

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
      throw new NotFoundException('Produto não encontrado');
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        status: 'INACTIVE',
        deletedAt: new Date(),
      },
    });

    await this.searchIndexQueue.removeProduct(productId);

    this.enqueueEmbedding(productId);
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
      throw new NotFoundException('Produto não encontrado');
    }

    if (!categoryIds.length) {
      throw new BadRequestException('É necessário informar ao menos um ID de categoria');
    }

    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    if (categories.length !== categoryIds.length) {
      throw new BadRequestException('Uma ou mais categorias não foram encontradas');
    }

    await this.prisma.productCategory.createMany({
      data: categoryIds.map((categoryId) => ({
        productId,
        categoryId,
      })),
      skipDuplicates: true,
    });

    this.enqueueEmbedding(productId);
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
      throw new NotFoundException('Produto não encontrado');
    }

    const existing = await this.prisma.productCategory.findUnique({
      where: {
        productId_categoryId: { productId, categoryId },
      },
    });

    if (!existing) {
      throw new NotFoundException('Associação de categoria não encontrada');
    }

    await this.prisma.productCategory.delete({
      where: {
        productId_categoryId: { productId, categoryId },
      },
    });

    this.enqueueEmbedding(productId);
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
      throw new NotFoundException('Produto não encontrado');
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
    return resolveUniqueSlug({
      providedSlug,
      name,
      excludeId: excludeProductId,
      conflictMessage: 'Slug já está em uso para esta empresa',
      findExisting: (baseSlug) =>
        this.prisma.product.findMany({
          where: {
            companyId,
            ...buildSlugLookupWhere(baseSlug),
          },
          select: { id: true, slug: true },
        }),
    });
  }

  private async validateBrand(companyId: string, brandId: string): Promise<void> {
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      select: { companyId: true },
    });

    if (!brand) {
      throw new NotFoundException('Marca não encontrada');
    }

    if (brand.companyId !== companyId) {
      throw new ForbiddenException('A marca não pertence a esta empresa');
    }
  }

  async addTags(companyId: string, productId: string, tagIds: string[]): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');

    const tags = await this.prisma.tag.findMany({ where: { id: { in: tagIds } } });
    if (tags.length !== tagIds.length) {
      throw new BadRequestException('Uma ou mais tags não foram encontradas');
    }

    await this.prisma.productTag.createMany({
      data: tagIds.map((tagId) => ({ productId, tagId })),
      skipDuplicates: true,
    });

    this.enqueueEmbedding(productId);
  }

  async removeTags(companyId: string, productId: string, tagIds: string[]): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');

    await this.prisma.productTag.deleteMany({
      where: { productId, tagId: { in: tagIds } },
    });

    this.enqueueEmbedding(productId);
  }

  async replaceAllTags(companyId: string, productId: string, tagIds: string[]): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');

    await this.prisma.productTag.deleteMany({ where: { productId } });

    if (tagIds.length > 0) {
      const tags = await this.prisma.tag.findMany({ where: { id: { in: tagIds } } });
      if (tags.length !== tagIds.length) {
        throw new BadRequestException('Uma ou mais tags não foram encontradas');
      }

      await this.prisma.productTag.createMany({
        data: tagIds.map((tagId) => ({ productId, tagId })),
      });
    }

    this.enqueueEmbedding(productId);
  }

  async listTags(companyId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');

    const associations = await this.prisma.productTag.findMany({
      where: { productId },
      include: { tag: true },
    });

    return associations.map((a) => a.tag);
  }
}
