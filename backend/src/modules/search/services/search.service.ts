import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { EventsService } from '@/modules/events/events.service.js';
import { EventType } from '@/generated/prisma/enums.js';
import type {
  ISearchProvider,
  ProductSearchQuery,
  ProductSearchResult,
  StoreSearchQuery,
  StoreSearchResult,
  AutocompleteResult,
  AutocompleteType,
} from '../providers/search-provider.interface.js';
import { GeoHelper } from '@/common/helpers/geo.helper.js';
import { MAX_RADIUS_METERS, SEARCH_PROVIDER } from '../search.constants.js';

const GEO_OVERSAMPLE_MULTIPLIER = 5;
const GEO_MAX_CANDIDATES = 500;

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SEARCH_PROVIDER) private readonly provider: ISearchProvider,
    private readonly eventsService: EventsService,
  ) {}

  async searchProducts(
    query: ProductSearchQuery,
    userId: string | null = null,
  ): Promise<ProductSearchResult> {
    const hasGeo = query.lat !== undefined && query.lng !== undefined && query.radius !== undefined;

    const result = hasGeo
      ? await this.searchProductsWithGeo(query)
      : await this.provider.searchProducts(query);

    this.trackSearch(query.term, 'product', result.total, userId);
    return result;
  }

  private async searchProductsWithGeo(query: ProductSearchQuery): Promise<ProductSearchResult> {
    const oversampleLimit = Math.min(query.limit * GEO_OVERSAMPLE_MULTIPLIER, GEO_MAX_CANDIDATES);

    const geoCandidates = await this.provider.searchProducts({
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

  async searchStores(
    query: StoreSearchQuery,
    userId: string | null = null,
  ): Promise<StoreSearchResult> {
    const result = await this.provider.searchStores(query);
    this.trackSearch(query.term, 'store', result.total, userId);
    return result;
  }

  async autocomplete(term: string, type?: AutocompleteType, limit?: number): Promise<AutocompleteResult[]> {
    return this.provider.autocomplete(term, type ?? null, limit ?? 5);
  }

  /**
   * Records a SEARCH event without blocking or failing the API response.
   * Supports authenticated (userId) and anonymous (null) users.
   */
  private trackSearch(
    term: string,
    scope: 'product' | 'store',
    resultCount: number,
    userId: string | null,
  ): void {
    if (!term || term.trim() === '') {
      return;
    }

    void this.eventsService
      .track(
        {
          type: EventType.SEARCH,
          metadata: { query: term, scope, resultCount },
        },
        userId,
      )
      .catch((err) => this.logger.warn(`Failed to track search event: ${err}`));
  }
}
