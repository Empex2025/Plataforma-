import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../db/prisma.service.js';
import type { StoreSearchDocument } from '../documents/store-search.document.js';

@Injectable()
export class StoreIndexer {
  constructor(private readonly prisma: PrismaService) {}

  async buildDocument(storeId: string): Promise<StoreSearchDocument | null> {
    const storeRows = await this.prisma.$queryRaw<Array<{
      id: string;
      company_id: string;
      name: string;
      slug: string;
      description: string | null;
      city: string | null;
      state: string | null;
      neighborhood: string | null;
      lat: number | null;
      lng: number | null;
      status: string;
      updated_at: Date;
    }>>`
      SELECT id, company_id, name, slug, description, city, state, neighborhood,
        ST_Y(location::geometry) as lat,
        ST_X(location::geometry) as lng,
        status, updated_at
      FROM stores
      WHERE id = ${storeId}::uuid AND deleted_at IS NULL
    `;

    if (storeRows.length === 0) return null;
    const store = storeRows[0];

    const company = await this.prisma.company.findUnique({
      where: { id: store.company_id },
      select: { status: true },
    });
    if (!company || company.status !== 'ACTIVE') return null;

    const offers = await this.prisma.offer.findMany({
      where: {
        storeId: storeId,
        status: 'ACTIVE',
        startsAt: { lte: new Date() },
        endsAt: { gte: new Date() },
      },
      select: {
        products: { select: { product: { select: { categories: { select: { category: { select: { name: true } } } } } } } },
      },
    });

    const categoryNames = new Set<string>();
    for (const offer of offers) {
      for (const op of offer.products) {
        for (const pc of op.product.categories) {
          categoryNames.add(pc.category.name);
        }
      }
    }

    return {
      id: store.id,
      companyId: store.company_id,
      name: store.name,
      slug: store.slug,
      description: store.description,
      city: store.city,
      state: store.state,
      neighborhood: store.neighborhood,
      _geo: store.lat !== null && store.lng !== null
        ? { lat: Number(store.lat), lng: Number(store.lng) }
        : null,
      categoryNames: [...categoryNames],
      active: store.status === 'ACTIVE',
      updatedAt: store.updated_at.toISOString(),
    };
  }

  async buildDocuments(storeIds: string[]): Promise<StoreSearchDocument[]> {
    const docs: StoreSearchDocument[] = [];
    for (const id of storeIds) {
      const doc = await this.buildDocument(id);
      if (doc) docs.push(doc);
    }
    return docs;
  }
}
