import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../db/prisma.service.js';
import type { ProductSearchDocument } from '../documents/product-search.document.js';

@Injectable()
export class ProductIndexer {
  constructor(private readonly prisma: PrismaService) {}

  async buildDocument(productId: string): Promise<ProductSearchDocument | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        brand: { select: { id: true, name: true } },
        categories: {
          include: { category: { select: { id: true, name: true } } },
        },
        prices: {
          where: { validTo: null },
          select: { storeId: true, value: true },
        },
        inventory: {
          select: { storeId: true, quantity: true },
        },
      },
    });

    if (!product || product.deletedAt) return null;

    const company = await this.prisma.company.findUnique({
      where: { id: product.companyId },
      select: { status: true },
    });
    if (!company || company.status !== 'ACTIVE') return null;

    const storeIds = [...new Set([
      ...product.prices.map(p => p.storeId),
      ...product.inventory.map(i => i.storeId),
    ])];

    let storeNames: string[] = [];
    if (storeIds.length > 0) {
      const stores = await this.prisma.store.findMany({
        where: { id: { in: storeIds }, deletedAt: null },
        select: { id: true, name: true, city: true, state: true },
      });
      storeNames = stores.map(s => s.name);
    }

    const storeCities: string[] = [];
    const storeStates: string[] = [];
    if (storeIds.length > 0) {
      const locationData = await this.prisma.$queryRaw<Array<{ city: string | null; state: string | null }>>`
        SELECT DISTINCT city, state FROM stores
        WHERE id = ANY(${storeIds}::uuid[]) AND deleted_at IS NULL
      `;
      for (const row of locationData) {
        if (row.city) storeCities.push(row.city);
        if (row.state) storeStates.push(row.state);
      }
    }

    const prices = product.prices.map(p => p.value.toNumber());
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

    const hasStock = product.inventory.some(i => i.quantity > 0);

    return {
      id: product.id,
      companyId: product.companyId,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      barcode: product.barcode,
      description: product.description,
      brandId: product.brand?.id ?? null,
      brandName: product.brand?.name ?? null,
      categoryIds: product.categories.map(pc => pc.categoryId),
      categoryNames: product.categories.map(pc => pc.category.name),
      storeIds,
      storeNames,
      cities: [...new Set(storeCities)],
      states: [...new Set(storeStates)],
      minPrice,
      maxPrice,
      hasStock,
      active: product.status === 'ACTIVE',
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  async buildDocuments(productIds: string[]): Promise<ProductSearchDocument[]> {
    const docs: ProductSearchDocument[] = [];
    for (const id of productIds) {
      const doc = await this.buildDocument(id);
      if (doc) docs.push(doc);
    }
    return docs;
  }
}
