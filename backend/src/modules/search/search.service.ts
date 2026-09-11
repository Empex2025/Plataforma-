import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service.js';
import { ISearchProvider, ProductSearchQuery, ProductSearchResult, StoreSearchQuery, StoreSearchResult, AutocompleteResult, AutocompleteType } from './providers/search-provider.interface.js';
import { GeoHelper } from '../../common/helpers/geo.helper.js';
import { MAX_RADIUS_METERS } from './search.constants.js';

const GEO_OVERSAMPLE_MULTIPLIER = 5;
const GEO_MAX_CANDIDATES = 500;

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private provider: ISearchProvider | null = null;

  constructor(private readonly prisma: PrismaService) {}

  setProvider(provider: ISearchProvider): void {
    this.provider = provider;
  }

  async searchProducts(query: ProductSearchQuery): Promise<ProductSearchResult> {
    if (!this.provider) {
      this.logger.warn('Search provider not configured — returning empty result');
      return { hits: [], total: 0, page: query.page, limit: query.limit, totalPages: 0 };
    }

    const hasGeo = query.lat !== undefined && query.lng !== undefined && query.radius !== undefined;

    if (hasGeo) {
      return this.searchProductsWithGeo(query);
    }

    return this.provider.searchProducts(query);
  }

  private async searchProductsWithGeo(query: ProductSearchQuery): Promise<ProductSearchResult> {
    const oversampleLimit = Math.min(query.limit * GEO_OVERSAMPLE_MULTIPLIER, GEO_MAX_CANDIDATES);

    const geoCandidates = await this.provider!.searchProducts({
      ...query,
      lat: undefined,
      lng: undefined,
      radius: undefined,
      page: 1,
      limit: oversampleLimit,
    });

    const productIds = geoCandidates.hits.map(h => h.id);
    if (productIds.length === 0) {
      return { hits: [], total: 0, page: query.page, limit: query.limit, totalPages: 0 };
    }

    const radius = Math.min(query.radius!, MAX_RADIUS_METERS);
    const point = GeoHelper.makePoint(query.lng!, query.lat!);

    const storeProducts = await this.prisma.$queryRaw<Array<{
      product_id: string;
      store_id: string;
      distance: number;
    }>>`
      SELECT DISTINCT
        ip.product_id,
        ip.store_id,
        ST_Distance(s.location::geography, ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography) as distance
      FROM inventory ip
      JOIN stores s ON s.id = ip.store_id AND s.deleted_at IS NULL
      WHERE ip.product_id = ANY(${productIds}::uuid[])
        AND ST_DWithin(s.location::geography, ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography, ${radius})
      ORDER BY distance
    `;

    const productStoreMap = new Map<string, Array<{ storeId: string; distance: number }>>();
    for (const row of storeProducts) {
      const existing = productStoreMap.get(row.product_id) ?? [];
      existing.push({ storeId: row.store_id, distance: row.distance });
      productStoreMap.set(row.product_id, existing);
    }

    const enrichedHits = geoCandidates.hits
      .filter(hit => productStoreMap.has(hit.id))
      .map(hit => ({
        ...hit,
        _distance: Math.min(...(productStoreMap.get(hit.id)?.map(s => s.distance) ?? [Infinity])),
      }))
      .sort((a, b) => a._distance - b._distance);

    const total = enrichedHits.length;
    const totalPages = Math.ceil(total / query.limit);
    const start = (query.page - 1) * query.limit;
    const paginatedHits = enrichedHits.slice(start, start + query.limit);

    return {
      hits: paginatedHits,
      total,
      page: query.page,
      limit: query.limit,
      totalPages,
    };
  }

  async searchStores(query: StoreSearchQuery): Promise<StoreSearchResult> {
    if (!this.provider) {
      this.logger.warn('Search provider not configured — returning empty result');
      return { hits: [], total: 0, page: query.page, limit: query.limit, totalPages: 0 };
    }

    return this.provider.searchStores(query);
  }

  async autocomplete(term: string, type?: AutocompleteType, limit?: number): Promise<AutocompleteResult[]> {
    if (!this.provider) {
      this.logger.warn('Search provider not configured — returning empty result');
      return [];
    }

    return this.provider.autocomplete(term, type ?? null, limit ?? 5);
  }
}
