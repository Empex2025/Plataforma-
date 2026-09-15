import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { IntelligenceSignalsService } from '@/modules/intelligence/services/intelligence-signals.service.js';
import { RecommendationContextDto } from '../dto/recommendation-context.dto.js';
import { RecommendationItemDto, RecommendationResponseDto } from '../dto/recommendation-response.dto.js';
import { RECOMMENDATIONS_DEFAULT_LIMIT, RECOMMENDATION_THRESHOLDS } from '../recommendations.constants.js';
import { computeRecommendationScore, normalize, invertNormalize, decayByDays, type RecommendationSignalScores } from '../helpers/recommendation-ranking.js';
import { buildRecommendationReasons, type RecommendationReasonContext } from '../helpers/recommendation-reasons.js';
import { buildUserAffinity, computeSearchRelevance, computeCategoryAffinityScore } from '../helpers/user-affinity.js';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly intelligenceSignals: IntelligenceSignalsService,
  ) {}

  async getProductRecommendations(
    ctx: RecommendationContextDto,
    userId?: string | null,
  ): Promise<RecommendationResponseDto> {
    const page = ctx.page ?? 1;
    const limit = ctx.limit ?? RECOMMENDATIONS_DEFAULT_LIMIT;

    const userAffinity = await buildUserAffinity(this.prisma, userId ?? null);

    const where: Record<string, unknown> = {
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (ctx.categoryId) {
      where.categories = { some: { categoryId: ctx.categoryId } };
    }

    if (ctx.categorySlug) {
      where.categories = { some: { category: { slug: ctx.categorySlug } } };
    }

    const products = await this.prisma.product.findMany({
      where,
      select: {
        id: true,
        companyId: true,
        name: true,
        slug: true,
        imageUrl: true,
        ratingAverage: true,
        ratingCount: true,
        createdAt: true,
        brand: { select: { name: true } },
        categories: { include: { category: { select: { id: true, name: true } } } },
        tags: { include: { tag: { select: { name: true } } } },
        prices: { where: { validTo: null }, select: { value: true } },
        inventory: { select: { quantity: true, storeId: true } },
      },
      take: 200,
    });

    if (products.length === 0) {
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }

    const productIds = products.map((p) => p.id);
    const storeIds = [...new Set(products.flatMap((p) => p.inventory.map((i) => i.storeId)))];

    const since = new Date();
    since.setDate(since.getDate() - RECOMMENDATION_THRESHOLDS.popularityHalfLifeDays);

    const [popularityScores, activeOffers] = await Promise.all([
      this.intelligenceSignals.getPopularityScore('product', productIds, since),
      this.prisma.offer.findMany({
        where: {
          status: 'ACTIVE',
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] },
          ],
        },
        select: { id: true, products: { select: { productId: true } } },
      }),
    ]);

    const popularityMap = new Map(popularityScores.map((p) => [p.id, p.score]));
    const offerProductIds = new Set(activeOffers.flatMap((o) => o.products.map((p) => p.productId)));

    const items: RecommendationItemDto[] = [];

    for (const product of products) {
      const prices = product.prices.map((pr) => pr.value.toNumber());
      const minPrice = prices.length > 0 ? Math.min(...prices) : null;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
      const hasStock = product.inventory.some((i) => i.quantity > 0);
      const ratingAverage = product.ratingAverage ? product.ratingAverage.toNumber() : null;
      const popularity = popularityMap.get(product.id) ?? 0;
      const hasActiveOffer = offerProductIds.has(product.id);

      let distance: number | null = null;
      if (ctx.lat !== undefined && ctx.lng !== undefined && storeIds.length > 0) {
        distance = await this.computeProductDistance(product.id, ctx.lat, ctx.lng);
      }

      const categoryIds = product.categories.map((c) => c.category.id);
      const categoryScore = computeCategoryAffinityScore(categoryIds, userAffinity.categoryAffinity);
      const searchScore = ctx.searchQuery
        ? computeSearchRelevance(product.name, [ctx.searchQuery.toLowerCase()])
        : (userAffinity.searchTerms.length > 0
          ? computeSearchRelevance(product.name, userAffinity.searchTerms)
          : 0);

      const daysSinceCreated = this.daysSince(product.createdAt);

      const signals: RecommendationSignalScores = {
        textRelevance: searchScore > 0 ? searchScore : 0.5,
        availability: hasStock ? 1 : 0.3,
        proximity: distance !== null ? invertNormalize(distance, 0, RECOMMENDATION_THRESHOLDS.nearbyDistance * 2) : 0.5,
        price: minPrice !== null ? invertNormalize(minPrice, RECOMMENDATION_THRESHOLDS.priceRange.min, RECOMMENDATION_THRESHOLDS.priceRange.max) : 0.5,
        popularity: normalize(popularity, 0, 10),
        rating: ratingAverage !== null ? normalize(ratingAverage, RECOMMENDATION_THRESHOLDS.ratingMin, 5) : 0.5,
        recency: decayByDays(daysSinceCreated, RECOMMENDATION_THRESHOLDS.recencyHalfLifeDays),
        onSale: hasActiveOffer ? 1 : 0,
        userAffinity: categoryScore,
      };

      const score = computeRecommendationScore(signals);

      const reasonCtx: RecommendationReasonContext = {
        distance,
        ratingAverage,
        hasStock,
        hasActiveOffer,
        popularityScore: popularity,
        daysSinceCreated,
        hasSearchQuery: searchScore > 0,
        hasUserFavorites: userAffinity.favoritedProductIds.includes(product.id),
        categoryAffinity: categoryScore > 0,
      };

      const reasons = buildRecommendationReasons(reasonCtx);

      items.push({
        id: product.id,
        type: 'product',
        name: product.name,
        slug: product.slug,
        companyId: product.companyId,
        imageUrl: product.imageUrl,
        minPrice,
        maxPrice,
        hasStock,
        ratingAverage,
        distance,
        reasons,
        _score: score,
      } as RecommendationItemDto & { _score: number });
    }

    const sorted = items
      .sort((a, b) => ((b as RecommendationItemDto & { _score: number })._score) - ((a as RecommendationItemDto & { _score: number })._score));

    const total = sorted.length;
    const start = (page - 1) * limit;
    const paginated = sorted.slice(start, start + limit).map((item) => {
      const { _score: _, ...rest } = item as RecommendationItemDto & { _score: number };
      return rest;
    });

    return {
      items: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStoreRecommendations(
    ctx: RecommendationContextDto,
    userId?: string | null,
  ): Promise<RecommendationResponseDto> {
    const page = ctx.page ?? 1;
    const limit = ctx.limit ?? RECOMMENDATIONS_DEFAULT_LIMIT;

    const userAffinity = await buildUserAffinity(this.prisma, userId ?? null);

    const where: Record<string, unknown> = {
      status: 'ACTIVE',
      deletedAt: null,
    };

    let stores;
    if (ctx.lat !== undefined && ctx.lng !== undefined) {
      const radius = RECOMMENDATION_THRESHOLDS.nearbyDistance * 2;
      const point = `POINT(${ctx.lng} ${ctx.lat})`;
      stores = await this.prisma.$queryRaw<Array<{
        id: string;
        name: string;
        slug: string;
        company_id: string;
        rating_average: number | null;
        rating_count: number;
        created_at: Date;
        distance: number;
      }>>`
        SELECT id, name, slug, company_id, rating_average, rating_count, created_at,
          ST_Distance(location::geography, ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography) as distance
        FROM stores
        WHERE deleted_at IS NULL
          AND status = 'ACTIVE'
          AND ST_DWithin(location::geography, ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography, ${radius})
        ORDER BY distance
        LIMIT 200
      `;
    } else {
      const dbStores = await this.prisma.store.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          companyId: true,
          ratingAverage: true,
          ratingCount: true,
          createdAt: true,
        },
        take: 200,
      });
      stores = dbStores.map((s) => ({
        ...s,
        company_id: s.companyId,
        rating_average: s.ratingAverage,
        rating_count: s.ratingCount,
        created_at: s.createdAt,
        distance: 0,
      }));
    }

    if (stores.length === 0) {
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }

    const storeIds = stores.map((s) => s.id);
    const since = new Date();
    since.setDate(since.getDate() - RECOMMENDATION_THRESHOLDS.popularityHalfLifeDays);

    const popularityScores = await this.intelligenceSignals.getPopularityScore('store', storeIds, since);
    const popularityMap = new Map(popularityScores.map((p) => [p.id, p.score]));

    const storeStock = await this.prisma.inventory.findMany({
      where: { storeId: { in: storeIds }, quantity: { gt: 0 } },
      select: { storeId: true },
      distinct: ['storeId'],
    });
    const storeHasStock = new Set(storeStock.map((i) => i.storeId));

    const items: RecommendationItemDto[] = [];

    for (const store of stores) {
      const ratingAverage = store.rating_average !== null ? Number(store.rating_average) : null;
      const popularity = popularityMap.get(store.id) ?? 0;
      const hasStock = storeHasStock.has(store.id);

      const signals: RecommendationSignalScores = {
        textRelevance: 0.5,
        availability: hasStock ? 1 : 0.3,
        proximity: store.distance > 0 ? invertNormalize(store.distance, 0, RECOMMENDATION_THRESHOLDS.nearbyDistance * 2) : 0.5,
        price: 0.5,
        popularity: normalize(popularity, 0, 10),
        rating: ratingAverage !== null ? normalize(ratingAverage, RECOMMENDATION_THRESHOLDS.ratingMin, 5) : 0.5,
        recency: decayByDays(this.daysSince(store.created_at), RECOMMENDATION_THRESHOLDS.recencyHalfLifeDays),
        onSale: 0,
        userAffinity: userAffinity.favoritedStoreIds.includes(store.id) ? 1 : 0,
      };

      const score = computeRecommendationScore(signals);

      const reasonCtx: RecommendationReasonContext = {
        distance: store.distance > 0 ? store.distance : null,
        ratingAverage,
        hasStock,
        popularityScore: popularity,
        daysSinceCreated: this.daysSince(store.created_at),
        hasUserFavorites: userAffinity.favoritedStoreIds.includes(store.id),
      };

      const reasons = buildRecommendationReasons(reasonCtx);

      items.push({
        id: store.id,
        type: 'store',
        name: store.name,
        slug: store.slug,
        companyId: store.company_id,
        imageUrl: null,
        minPrice: null,
        maxPrice: null,
        hasStock,
        ratingAverage,
        distance: store.distance > 0 ? store.distance : null,
        reasons,
        _score: score,
      } as RecommendationItemDto & { _score: number });
    }

    const sorted = items
      .sort((a, b) => ((b as RecommendationItemDto & { _score: number })._score) - ((a as RecommendationItemDto & { _score: number })._score));

    const total = sorted.length;
    const start = (page - 1) * limit;
    const paginated = sorted.slice(start, start + limit).map((item) => {
      const { _score: _, ...rest } = item as RecommendationItemDto & { _score: number };
      return rest;
    });

    return {
      items: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOfferRecommendations(
    ctx: RecommendationContextDto,
    _userId?: string | null,
  ): Promise<RecommendationResponseDto> {
    const page = ctx.page ?? 1;
    const limit = ctx.limit ?? RECOMMENDATIONS_DEFAULT_LIMIT;

    const offers = await this.prisma.offer.findMany({
      where: {
        status: 'ACTIVE',
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] },
        ],
      },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                companyId: true,
                name: true,
                slug: true,
                imageUrl: true,
                ratingAverage: true,
                ratingCount: true,
                createdAt: true,
                categories: { include: { category: { select: { id: true, name: true } } } },
                prices: { where: { validTo: null }, select: { value: true } },
                inventory: { select: { quantity: true } },
              },
            },
          },
        },
      },
      take: 200,
    });

    if (offers.length === 0) {
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }

    const items: RecommendationItemDto[] = [];

    for (const offer of offers) {
      if (offer.products.length === 0) continue;

      const primaryProduct = offer.products[0]?.product;
      if (!primaryProduct) continue;

      const prices = primaryProduct.prices.map((pr) => pr.value.toNumber());
      const minPrice = prices.length > 0 ? Math.min(...prices) : null;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
      const hasStock = primaryProduct.inventory.some((i) => i.quantity > 0);
      const ratingAverage = primaryProduct.ratingAverage ? primaryProduct.ratingAverage.toNumber() : null;

      let discountPercentage: number | null = null;
      if (offer.discountType === 'PERCENTAGE') {
        discountPercentage = offer.discountValue.toNumber();
      } else if (minPrice !== null && minPrice > 0) {
        discountPercentage = (offer.discountValue.toNumber() / minPrice) * 100;
      }

      const daysSinceCreated = this.daysSince(primaryProduct.createdAt);

      const signals: RecommendationSignalScores = {
        textRelevance: ctx.searchQuery
          ? computeSearchRelevance(offer.title, [ctx.searchQuery.toLowerCase()])
          : 0.5,
        availability: hasStock ? 1 : 0.3,
        proximity: 0.5,
        price: minPrice !== null ? invertNormalize(minPrice, RECOMMENDATION_THRESHOLDS.priceRange.min, RECOMMENDATION_THRESHOLDS.priceRange.max) : 0.5,
        popularity: 0.5,
        rating: ratingAverage !== null ? normalize(ratingAverage, RECOMMENDATION_THRESHOLDS.ratingMin, 5) : 0.5,
        recency: decayByDays(daysSinceCreated, RECOMMENDATION_THRESHOLDS.recencyHalfLifeDays),
        onSale: 1,
        userAffinity: 0,
      };

      const score = computeRecommendationScore(signals);

      const reasonCtx: RecommendationReasonContext = {
        hasStock,
        hasActiveOffer: true,
        ratingAverage,
        daysSinceCreated,
        discountPercentage,
      };

      const reasons = buildRecommendationReasons(reasonCtx);

      items.push({
        id: offer.id,
        type: 'offer',
        name: offer.title,
        slug: offer.title.toLowerCase().replace(/\s+/g, '-'),
        companyId: offer.companyId,
        imageUrl: primaryProduct.imageUrl,
        minPrice,
        maxPrice,
        hasStock,
        ratingAverage,
        distance: null,
        reasons,
        _score: score,
      } as RecommendationItemDto & { _score: number });
    }

    const sorted = items
      .sort((a, b) => ((b as RecommendationItemDto & { _score: number })._score) - ((a as RecommendationItemDto & { _score: number })._score));

    const total = sorted.length;
    const start = (page - 1) * limit;
    const paginated = sorted.slice(start, start + limit).map((item) => {
      const { _score: _, ...rest } = item as RecommendationItemDto & { _score: number };
      return rest;
    });

    return {
      items: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSimilarProducts(
    productId: string,
    ctx: RecommendationContextDto,
    _userId?: string | null,
  ): Promise<RecommendationResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        categories: { select: { categoryId: true } },
        tags: { select: { tagId: true } },
        brandId: true,
      },
    });

    if (!product) {
      return { items: [], total: 0, page: ctx.page ?? 1, limit: ctx.limit ?? RECOMMENDATIONS_DEFAULT_LIMIT, totalPages: 0 };
    }

    const categoryIds = product.categories.map((c) => c.categoryId);
    const tagIds = product.tags.map((t) => t.tagId);

    const where: Record<string, unknown> = {
      id: { not: productId },
      status: 'ACTIVE',
      deletedAt: null,
      OR: [
        { categories: { some: { categoryId: { in: categoryIds } } } },
        { tags: { some: { tagId: { in: tagIds } } } },
        ...(product.brandId ? [{ brandId: product.brandId }] : []),
      ],
    };

    const similarProducts = await this.prisma.product.findMany({
      where,
      select: {
        id: true,
        companyId: true,
        name: true,
        slug: true,
        imageUrl: true,
        ratingAverage: true,
        ratingCount: true,
        createdAt: true,
        categories: { select: { categoryId: true } },
        tags: { select: { tagId: true } },
        prices: { where: { validTo: null }, select: { value: true } },
        inventory: { select: { quantity: true } },
      },
      take: 50,
    });

    if (similarProducts.length === 0) {
      return { items: [], total: 0, page: ctx.page ?? 1, limit: ctx.limit ?? RECOMMENDATIONS_DEFAULT_LIMIT, totalPages: 0 };
    }

    const items: RecommendationItemDto[] = [];

    for (const p of similarProducts) {
      const prices = p.prices.map((pr) => pr.value.toNumber());
      const minPrice = prices.length > 0 ? Math.min(...prices) : null;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
      const hasStock = p.inventory.some((i) => i.quantity > 0);
      const ratingAverage = p.ratingAverage ? p.ratingAverage.toNumber() : null;

      const sharedCategories = p.categories.filter((c) => categoryIds.includes(c.categoryId)).length;
      const sharedTags = p.tags?.length ?? 0;
      const similarityScore = (sharedCategories * 0.6 + sharedTags * 0.4);

      const signals: RecommendationSignalScores = {
        textRelevance: similarityScore,
        availability: hasStock ? 1 : 0.3,
        proximity: 0.5,
        price: minPrice !== null ? invertNormalize(minPrice, RECOMMENDATION_THRESHOLDS.priceRange.min, RECOMMENDATION_THRESHOLDS.priceRange.max) : 0.5,
        popularity: 0.5,
        rating: ratingAverage !== null ? normalize(ratingAverage, RECOMMENDATION_THRESHOLDS.ratingMin, 5) : 0.5,
        recency: decayByDays(this.daysSince(p.createdAt), RECOMMENDATION_THRESHOLDS.recencyHalfLifeDays),
        onSale: 0,
        userAffinity: 0,
      };

      const score = computeRecommendationScore(signals);

      const reasonCtx: RecommendationReasonContext = {
        ratingAverage,
        hasStock,
        isSimilarToViewed: true,
        daysSinceCreated: this.daysSince(p.createdAt),
      };

      const reasons = buildRecommendationReasons(reasonCtx);

      items.push({
        id: p.id,
        type: 'product',
        name: p.name,
        slug: p.slug,
        companyId: p.companyId,
        imageUrl: p.imageUrl,
        minPrice,
        maxPrice,
        hasStock,
        ratingAverage,
        distance: null,
        reasons,
        _score: score,
      } as RecommendationItemDto & { _score: number });
    }

    const sorted = items
      .sort((a, b) => ((b as RecommendationItemDto & { _score: number })._score) - ((a as RecommendationItemDto & { _score: number })._score));

    const page = ctx.page ?? 1;
    const limit = ctx.limit ?? RECOMMENDATIONS_DEFAULT_LIMIT;
    const total = sorted.length;
    const start = (page - 1) * limit;
    const paginated = sorted.slice(start, start + limit).map((item) => {
      const { _score: _, ...rest } = item as RecommendationItemDto & { _score: number };
      return rest;
    });

    return {
      items: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSimilarStores(
    storeId: string,
    ctx: RecommendationContextDto,
    _userId?: string | null,
  ): Promise<RecommendationResponseDto> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        city: true,
        state: true,
        companyId: true,
      },
    });

    if (!store) {
      return { items: [], total: 0, page: ctx.page ?? 1, limit: ctx.limit ?? RECOMMENDATIONS_DEFAULT_LIMIT, totalPages: 0 };
    }

    const where: Record<string, unknown> = {
      id: { not: storeId },
      status: 'ACTIVE',
      deletedAt: null,
      OR: [
        { city: store.city },
        { state: store.state },
      ],
    };

    const similarStores = await this.prisma.store.findMany({
      where,
      select: {
        id: true,
        companyId: true,
        name: true,
        slug: true,
        ratingAverage: true,
        ratingCount: true,
        createdAt: true,
      },
      take: 50,
    });

    if (similarStores.length === 0) {
      return { items: [], total: 0, page: ctx.page ?? 1, limit: ctx.limit ?? RECOMMENDATIONS_DEFAULT_LIMIT, totalPages: 0 };
    }

    const items: RecommendationItemDto[] = [];

    for (const s of similarStores) {
      const ratingAverage = s.ratingAverage ? s.ratingAverage.toNumber() : null;

      const signals: RecommendationSignalScores = {
        textRelevance: 0.5,
        availability: 0.5,
        proximity: 0.5,
        price: 0.5,
        popularity: 0.5,
        rating: ratingAverage !== null ? normalize(ratingAverage, RECOMMENDATION_THRESHOLDS.ratingMin, 5) : 0.5,
        recency: decayByDays(this.daysSince(s.createdAt), RECOMMENDATION_THRESHOLDS.recencyHalfLifeDays),
        onSale: 0,
        userAffinity: 0,
      };

      const score = computeRecommendationScore(signals);

      const reasonCtx: RecommendationReasonContext = {
        ratingAverage,
        daysSinceCreated: this.daysSince(s.createdAt),
      };

      const reasons = buildRecommendationReasons(reasonCtx);

      items.push({
        id: s.id,
        type: 'store',
        name: s.name,
        slug: s.slug,
        companyId: s.companyId,
        imageUrl: null,
        minPrice: null,
        maxPrice: null,
        hasStock: undefined,
        ratingAverage,
        distance: null,
        reasons,
        _score: score,
      } as RecommendationItemDto & { _score: number });
    }

    const sorted = items
      .sort((a, b) => ((b as RecommendationItemDto & { _score: number })._score) - ((a as RecommendationItemDto & { _score: number })._score));

    const page = ctx.page ?? 1;
    const limit = ctx.limit ?? RECOMMENDATIONS_DEFAULT_LIMIT;
    const total = sorted.length;
    const start = (page - 1) * limit;
    const paginated = sorted.slice(start, start + limit).map((item) => {
      const { _score: _, ...rest } = item as RecommendationItemDto & { _score: number };
      return rest;
    });

    return {
      items: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async computeProductDistance(productId: string, lat: number, lng: number): Promise<number | null> {
    const point = `POINT(${lng} ${lat})`;
    const result = await this.prisma.$queryRaw<Array<{ distance: number }>>`
      SELECT MIN(ST_Distance(s.location::geography, ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography)) as distance
      FROM inventory ip
      JOIN stores s ON s.id = ip.store_id AND s.deleted_at IS NULL
      WHERE ip.product_id = ${productId}
    `;

    return result.length > 0 && result[0].distance !== null ? Number(result[0].distance) : null;
  }

  private daysSince(date: Date): number {
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  }
}
