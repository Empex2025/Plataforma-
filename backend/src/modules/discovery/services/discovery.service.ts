import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { TrendingService } from './trending.service.js';
import { NewItemsService } from './new-items.service.js';
import { computeRankingScore, normalize, invertNormalize, decayByDays, type SignalScores } from '../helpers/discovery-ranking.js';
import { buildReasons, type ReasonContext } from '../helpers/discovery-reasons.js';
import { DISCOVERY_THRESHOLDS, DISCOVERY_DEFAULT_PAGE_LIMIT } from '../discovery.constants.js';
import type { DiscoveryHitDto, DiscoveryResponseDto, DiscoverySignalDto } from '../dto/discovery-response.dto.js';
import type { DiscoveryQueryDto } from '../dto/discovery-query.dto.js';

interface InternalHit extends DiscoveryHitDto {
  _daysSinceCreated: number;
  _viewCount?: number;
  _signals?: SignalScores;
}

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly trendingService: TrendingService,
    private readonly newItemsService: NewItemsService,
  ) {}

  async getFeed(query: DiscoveryQueryDto): Promise<DiscoveryResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DISCOVERY_DEFAULT_PAGE_LIMIT;

    const [productHits, storeHits] = await Promise.all([
      this.discoverProducts(query),
      this.discoverStores(query),
    ]);

    const allHits = [...productHits, ...storeHits];
    const deduplicated = this.deduplicate(allHits);
    const ranked = this.rankAll(deduplicated, query);
    const sorted = this.sortResults(ranked, query.sort);

    return this.paginate(sorted, page, limit);
  }

  async getOffers(query: DiscoveryQueryDto): Promise<DiscoveryResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DISCOVERY_DEFAULT_PAGE_LIMIT;

    const offers = await this.prisma.offer.findMany({
      where: {
        status: 'ACTIVE',
        ...(query.companyId ? { companyId: query.companyId } : {}),
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] },
        ],
      },
      include: {
        products: { select: { productId: true } },
      },
      take: 200,
    });

    const productIds = [...new Set(offers.flatMap((o) => o.products.map((p) => p.productId)))];

    if (productIds.length === 0) {
      return { hits: [], total: 0, page, limit, totalPages: 0 };
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, status: 'ACTIVE', deletedAt: null },
      include: {
        brand: { select: { name: true } },
        categories: { include: { category: { select: { name: true } } } },
        tags: { include: { tag: { select: { name: true } } } },
        prices: { where: { validTo: null }, select: { value: true } },
        inventory: { select: { quantity: true } },
      },
    });

    const hits: DiscoveryHitDto[] = products.map((p) => {
      const prices = p.prices.map((pr) => pr.value.toNumber());
      const minPrice = prices.length > 0 ? Math.min(...prices) : null;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
      const hasStock = p.inventory.some((i) => i.quantity > 0);
      const ratingAverage = p.ratingAverage ? p.ratingAverage.toNumber() : null;

      const ctx: ReasonContext = {
        hasStock,
        hasActiveOffer: true,
        ratingAverage,
      };

      return {
        id: p.id,
        type: 'product',
        name: p.name,
        slug: p.slug,
        description: p.description,
        imageUrl: p.imageUrl,
        companyId: p.companyId,
        brandName: p.brand?.name ?? null,
        categoryNames: p.categories.map((c) => c.category.name),
        tagNames: p.tags.map((t) => t.tag.name),
        minPrice,
        maxPrice,
        hasStock,
        ratingAverage,
        reasons: buildReasons(ctx),
        score: 1,
        distance: null,
      };
    });

    const total = hits.length;
    const start = (page - 1) * limit;
    const paginated = hits.slice(start, start + limit);

    return { hits: paginated, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getNew(query: DiscoveryQueryDto): Promise<DiscoveryResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DISCOVERY_DEFAULT_PAGE_LIMIT;

    const [productIds, storeIds] = await Promise.all([
      this.newItemsService.getNewProductIds(query.companyId),
      this.newItemsService.getNewStoreIds(query.companyId),
    ]);

    const [products, stores] = await Promise.all([
      productIds.length > 0
        ? this.prisma.product.findMany({
            where: { id: { in: productIds }, status: 'ACTIVE', deletedAt: null },
            include: {
              brand: { select: { name: true } },
              categories: { include: { category: { select: { name: true } } } },
              tags: { include: { tag: { select: { name: true } } } },
              prices: { where: { validTo: null }, select: { value: true } },
              inventory: { select: { quantity: true } },
            },
          })
        : Promise.resolve([]),
      storeIds.length > 0
        ? this.prisma.store.findMany({
            where: { id: { in: storeIds }, status: 'ACTIVE', deletedAt: null },
          })
        : Promise.resolve([]),
    ]);

    const hits: DiscoveryHitDto[] = [];

    for (const p of products) {
      const prices = p.prices.map((pr) => pr.value.toNumber());
      const minPrice = prices.length > 0 ? Math.min(...prices) : null;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
      const hasStock = p.inventory.some((i) => i.quantity > 0);
      const ratingAverage = p.ratingAverage ? p.ratingAverage.toNumber() : null;
      const daysSinceCreated = this.daysSince(p.createdAt);

      hits.push({
        id: p.id,
        type: 'product',
        name: p.name,
        slug: p.slug,
        description: p.description,
        imageUrl: p.imageUrl,
        companyId: p.companyId,
        brandName: p.brand?.name ?? null,
        categoryNames: p.categories.map((c) => c.category.name),
        tagNames: p.tags.map((t) => t.tag.name),
        minPrice,
        maxPrice,
        hasStock,
        ratingAverage,
        reasons: buildReasons({ hasStock, ratingAverage, daysSinceCreated }),
        score: 1,
        distance: null,
      });
    }

    for (const s of stores) {
      const ratingAverage = s.ratingAverage ? s.ratingAverage.toNumber() : null;
      const daysSinceCreated = this.daysSince(s.createdAt);

      hits.push({
        id: s.id,
        type: 'store',
        name: s.name,
        slug: s.slug,
        description: null,
        imageUrl: null,
        companyId: s.companyId,
        brandName: null,
        categoryNames: [],
        tagNames: [],
        minPrice: null,
        maxPrice: null,
        hasStock: undefined,
        ratingAverage,
        reasons: buildReasons({ ratingAverage, daysSinceCreated }),
        score: 1,
        distance: null,
      });
    }

    return this.paginate(hits, page, limit);
  }

  async getTrending(query: DiscoveryQueryDto): Promise<DiscoveryResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DISCOVERY_DEFAULT_PAGE_LIMIT;

    const [trendingProducts, trendingStores] = await Promise.all([
      this.trendingService.getTrendingProductIds(query.companyId),
      this.trendingService.getTrendingStoreIds(),
    ]);

    const productIds = trendingProducts.map((t) => t.targetId);
    const storeIds = trendingStores.map((t) => t.targetId);

    const [products, stores] = await Promise.all([
      productIds.length > 0
        ? this.prisma.product.findMany({
            where: { id: { in: productIds }, status: 'ACTIVE', deletedAt: null },
            include: {
              brand: { select: { name: true } },
              categories: { include: { category: { select: { name: true } } } },
              tags: { include: { tag: { select: { name: true } } } },
              prices: { where: { validTo: null }, select: { value: true } },
              inventory: { select: { quantity: true } },
            },
          })
        : Promise.resolve([]),
      storeIds.length > 0
        ? this.prisma.store.findMany({
            where: { id: { in: storeIds }, status: 'ACTIVE', deletedAt: null },
          })
        : Promise.resolve([]),
    ]);

    const trendingProductMap = new Map(trendingProducts.map((t) => [t.targetId, t]));
    const trendingStoreMap = new Map(trendingStores.map((t) => [t.targetId, t]));

    const hits: DiscoveryHitDto[] = [];

    for (const p of products) {
      const prices = p.prices.map((pr) => pr.value.toNumber());
      const minPrice = prices.length > 0 ? Math.min(...prices) : null;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
      const hasStock = p.inventory.some((i) => i.quantity > 0);
      const ratingAverage = p.ratingAverage ? p.ratingAverage.toNumber() : null;
      const trending = trendingProductMap.get(p.id);

      hits.push({
        id: p.id,
        type: 'product',
        name: p.name,
        slug: p.slug,
        description: p.description,
        imageUrl: p.imageUrl,
        companyId: p.companyId,
        brandName: p.brand?.name ?? null,
        categoryNames: p.categories.map((c) => c.category.name),
        tagNames: p.tags.map((t) => t.tag.name),
        minPrice,
        maxPrice,
        hasStock,
        ratingAverage,
        reasons: buildReasons({ hasStock, ratingAverage, viewCount: trending?.viewCount }),
        score: trending?.score ?? 0,
        distance: null,
      });
    }

    for (const s of stores) {
      const ratingAverage = s.ratingAverage ? s.ratingAverage.toNumber() : null;
      const trending = trendingStoreMap.get(s.id);

      hits.push({
        id: s.id,
        type: 'store',
        name: s.name,
        slug: s.slug,
        description: null,
        imageUrl: null,
        companyId: s.companyId,
        brandName: null,
        categoryNames: [],
        tagNames: [],
        minPrice: null,
        maxPrice: null,
        hasStock: undefined,
        ratingAverage,
        reasons: buildReasons({ ratingAverage, viewCount: trending?.viewCount }),
        score: trending?.score ?? 0,
        distance: null,
      });
    }

    hits.sort((a, b) => b.score - a.score);

    return this.paginate(hits, page, limit);
  }

  async getNearby(query: DiscoveryQueryDto): Promise<DiscoveryResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DISCOVERY_DEFAULT_PAGE_LIMIT;
    const radius = query.radius ?? DISCOVERY_THRESHOLDS.nearbyDefaultRadius;

    if (query.lat === undefined || query.lng === undefined) {
      return { hits: [], total: 0, page, limit, totalPages: 0 };
    }

    const point = `POINT(${query.lng} ${query.lat})`;
    const nearbyStores = await this.prisma.$queryRaw<Array<{
      id: string;
      name: string;
      slug: string;
      company_id: string;
      rating_average: number | null;
      distance: number;
    }>>`
      SELECT id, name, slug, company_id, rating_average,
        ST_Distance(location::geography, ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography) as distance
      FROM stores
      WHERE deleted_at IS NULL
        AND status = 'ACTIVE'
        AND ST_DWithin(location::geography, ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography, ${radius})
      ORDER BY distance
      LIMIT 200
    `;

    const storeIds = nearbyStores.map((s) => s.id);

    if (storeIds.length === 0) {
      return { hits: [], total: 0, page, limit, totalPages: 0 };
    }

    const storeStock = await this.prisma.inventory.findMany({
      where: { storeId: { in: storeIds }, quantity: { gt: 0 } },
      select: { storeId: true },
      distinct: ['storeId'],
    });
    const storeHasStock = new Set(storeStock.map((i) => i.storeId));

    const hits: DiscoveryHitDto[] = nearbyStores.map((ns) => {
      const ratingAverage = ns.rating_average !== null ? Number(ns.rating_average) : null;
      const hasStock = storeHasStock.has(ns.id);

      return {
        id: ns.id,
        type: 'store',
        name: ns.name,
        slug: ns.slug,
        description: null,
        imageUrl: null,
        companyId: ns.company_id,
        brandName: null,
        categoryNames: [],
        tagNames: [],
        minPrice: null,
        maxPrice: null,
        hasStock,
        ratingAverage,
        reasons: buildReasons({ distance: ns.distance, ratingAverage, hasStock }),
        score: invertNormalize(ns.distance, 0, radius),
        distance: ns.distance,
      };
    });

    return this.paginate(hits, page, limit);
  }

  private async discoverProducts(query: DiscoveryQueryDto): Promise<InternalHit[]> {
    const where: Record<string, unknown> = {
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (query.companyId) where.companyId = query.companyId;
    if (query.categoryId) where.categories = { some: { categoryId: query.categoryId } };
    if (query.tagSlug) where.tags = { some: { tag: { slug: query.tagSlug } } };

    const products = await this.prisma.product.findMany({
      where,
      include: {
        brand: { select: { name: true } },
        categories: { include: { category: { select: { name: true } } } },
        tags: { include: { tag: { select: { name: true } } } },
        prices: { where: { validTo: null }, select: { value: true } },
        inventory: { select: { quantity: true } },
      },
      take: 200,
    });

    return products.map((p) => {
      const prices = p.prices.map((pr) => pr.value.toNumber());
      const minPrice = prices.length > 0 ? Math.min(...prices) : null;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
      const hasStock = p.inventory.some((i) => i.quantity > 0);
      const ratingAverage = p.ratingAverage ? p.ratingAverage.toNumber() : null;

      return {
        id: p.id,
        type: 'product' as const,
        name: p.name,
        slug: p.slug,
        description: p.description,
        imageUrl: p.imageUrl,
        companyId: p.companyId,
        brandName: p.brand?.name ?? null,
        categoryNames: p.categories.map((c) => c.category.name),
        tagNames: p.tags.map((t) => t.tag.name),
        minPrice,
        maxPrice,
        hasStock,
        ratingAverage,
        reasons: [],
        score: 0,
        distance: null,
        _daysSinceCreated: this.daysSince(p.createdAt),
      };
    });
  }

  private async discoverStores(query: DiscoveryQueryDto): Promise<InternalHit[]> {
    const where: Record<string, unknown> = {
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (query.companyId) where.companyId = query.companyId;

    const stores = await this.prisma.store.findMany({ where, take: 200 });

    return stores.map((s) => {
      const ratingAverage = s.ratingAverage ? s.ratingAverage.toNumber() : null;

      return {
        id: s.id,
        type: 'store' as const,
        name: s.name,
        slug: s.slug,
        description: null,
        imageUrl: null,
        companyId: s.companyId,
        brandName: null,
        categoryNames: [],
        tagNames: [],
        minPrice: null,
        maxPrice: null,
        hasStock: undefined,
        ratingAverage,
        reasons: [],
        score: 0,
        distance: null,
        _daysSinceCreated: this.daysSince(s.createdAt),
      };
    });
  }

  private deduplicate(hits: InternalHit[]): InternalHit[] {
    const seen = new Set<string>();
    return hits.filter((h) => {
      const key = `${h.type}:${h.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private rankAll(hits: InternalHit[], query: DiscoveryQueryDto): InternalHit[] {
    return hits.map((h) => {
      const signals: SignalScores = {
        textRelevance: query.q ? this.computeTextRelevance(h, query.q) : 0.5,
        availability: h.hasStock === true ? 1 : 0.3,
        proximity:
          h.distance !== null && h.distance !== undefined
            ? invertNormalize(h.distance, 0, DISCOVERY_THRESHOLDS.nearbyMaxRadius)
            : 0.5,
        price:
          h.minPrice !== null && h.minPrice !== undefined ? invertNormalize(h.minPrice, 0, 1000) : 0.5,
        popularity: 0.5,
        rating:
          h.ratingAverage !== null && h.ratingAverage !== undefined
            ? normalize(h.ratingAverage, DISCOVERY_THRESHOLDS.ratingMin, 5)
            : 0.5,
        recency: decayByDays(h._daysSinceCreated, DISCOVERY_THRESHOLDS.recencyNewDays),
      };

      const ctx: ReasonContext = {
        distance: h.distance,
        ratingAverage: h.ratingAverage,
        hasStock: h.hasStock,
        hasActiveOffer: false,
        viewCount: h._viewCount,
        daysSinceCreated: h._daysSinceCreated,
      };

      const signalDto: DiscoverySignalDto = {
        textRelevance: signals.textRelevance,
        availability: signals.availability,
        proximity: signals.proximity,
        price: signals.price,
        popularity: signals.popularity,
        rating: signals.rating,
        recency: signals.recency,
      };

      return {
        ...h,
        score: computeRankingScore(signals),
        reasons: buildReasons(ctx),
        signals: signalDto,
        _signals: signals,
      };
    });
  }

  private sortResults(hits: InternalHit[], sort?: string): InternalHit[] {
    switch (sort) {
      case 'distance':
        return hits.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
      case 'price_asc':
        return hits.sort((a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity));
      case 'price_desc':
        return hits.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0));
      case 'newest':
        return hits.sort((a, b) => a._daysSinceCreated - b._daysSinceCreated);
      default:
        return hits.sort((a, b) => b.score - a.score);
    }
  }

  private paginate(hits: DiscoveryHitDto[], page: number, limit: number): DiscoveryResponseDto {
    const total = hits.length;
    const start = (page - 1) * limit;
    return {
      hits: hits.slice(start, start + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private daysSince(date: Date): number {
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  private computeTextRelevance(hit: DiscoveryHitDto, term: string): number {
    const lowerTerm = term.toLowerCase();
    const nameMatch = hit.name.toLowerCase().includes(lowerTerm) ? 1 : 0;
    const descMatch = hit.description?.toLowerCase().includes(lowerTerm) ? 0.5 : 0;
    const brandMatch = hit.brandName?.toLowerCase().includes(lowerTerm) ? 0.8 : 0;
    const tagMatch = hit.tagNames?.some((t) => t.toLowerCase().includes(lowerTerm)) ? 0.7 : 0;
    const catMatch = hit.categoryNames?.some((c) => c.toLowerCase().includes(lowerTerm)) ? 0.6 : 0;

    return Math.max(nameMatch, descMatch, brandMatch, tagMatch, catMatch);
  }
}
