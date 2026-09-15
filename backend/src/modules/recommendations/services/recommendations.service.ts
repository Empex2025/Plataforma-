import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { IntelligenceSignalsService } from '@/modules/intelligence/services/intelligence-signals.service.js';
import type { EmbeddingEntityType } from '@/modules/ai/ai.types.js';
import { RecommendationContextDto } from '../dto/recommendation-context.dto.js';
import { RecommendationItemDto, RecommendationResponseDto } from '../dto/recommendation-response.dto.js';
import { RECOMMENDATIONS_DEFAULT_LIMIT, RECOMMENDATION_THRESHOLDS } from '../recommendations.constants.js';
import { computeRecommendationScore, normalize, invertNormalize, decayByDays, type RecommendationSignalScores } from '../helpers/recommendation-ranking.js';
import { buildRecommendationReasons, type RecommendationReasonContext } from '../helpers/recommendation-reasons.js';
import { buildUserAffinity, computeSearchRelevance, computeCategoryAffinityScore } from '../helpers/user-affinity.js';
import { mergeCandidates } from '../helpers/candidate-merge.js';
import { AI_CANDIDATE_LIMITS } from '../ai-recommendation.constants.js';
import { AiRecommendationService, type RankableItem } from './ai-recommendation.service.js';
import { RecommendationStrategyResolver } from '@/modules/experiments/services/recommendation-strategy.resolver.js';
import type { RecommendationStrategy } from '@/modules/experiments/experiments.types.js';
import { EventsService } from '@/modules/events/events.service.js';
import { EventType } from '@/generated/prisma/enums.js';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly intelligenceSignals: IntelligenceSignalsService,
    @Optional() private readonly aiRanking?: AiRecommendationService,
    @Optional() private readonly strategyResolver?: RecommendationStrategyResolver,
    @Optional() private readonly eventsService?: EventsService,
  ) {}

  private async applyAiRanking(
    entityType: EmbeddingEntityType,
    items: RankableItem[],
    ctx: RecommendationContextDto,
    options: {
      userId?: string | null;
      behavioralById?: Map<string, number>;
      semanticEntityId?: string;
    } = {},
  ): Promise<RankableItem[]> {
    if (items.length === 0) return items;

    const resolved = await this.resolveStrategy(options.userId ?? null);
    const trackImpression = (): void => {
      if (resolved) this.trackRecommendationImpression(options.userId ?? null, entityType);
    };

    if (resolved?.strategy === 'deterministic') {
      trackImpression();
      return items;
    }

    if (!this.aiRanking?.enabled) {
      trackImpression();
      return items;
    }

    try {
      const ranked = await this.aiRanking.rank(entityType, items, {
        searchQuery: ctx.searchQuery,
        semanticEntityId: options.semanticEntityId,
        behavioralById: options.behavioralById,
      });
      trackImpression();
      return ranked;
    } catch (error) {
      this.logger.warn(
        `AI ranking unavailable, falling back to deterministic ranking: ${(error as Error).message}`,
      );
      trackImpression();
      return items;
    }
  }

  private async resolveStrategy(
    userId: string | null,
  ): Promise<{ strategy: RecommendationStrategy } | null> {
    if (!this.strategyResolver) return null;
    try {
      const resolved = await this.strategyResolver.resolve(userId);
      return resolved ? { strategy: resolved.strategy } : null;
    } catch (error) {
      this.logger.warn(`Experiment strategy resolution failed: ${(error as Error).message}`);
      return null;
    }
  }

  private trackRecommendationImpression(userId: string | null, entityType: EmbeddingEntityType): void {
    if (!userId || !this.eventsService) return;
    void this.eventsService
      .track({ type: EventType.RECOMMENDATION_IMPRESSION, targetType: entityType }, userId)
      .catch((error) => this.logger.warn(`Failed to track recommendation impression: ${(error as Error).message}`));
  }

  private buildSimilarProductItem(
    p: {
      id: string;
      companyId: string;
      name: string;
      slug: string;
      imageUrl: string | null;
      ratingAverage: { toNumber(): number } | null;
      createdAt: Date;
      categories: Array<{ categoryId: string }>;
      tags: Array<{ tagId: string }>;
      prices: Array<{ value: { toNumber(): number } }>;
      inventory: Array<{ quantity: number }>;
    },
    categoryIds: string[],
  ): RankableItem {
    const prices = p.prices.map((pr) => pr.value.toNumber());
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
    const hasStock = p.inventory.some((i) => i.quantity > 0);
    const ratingAverage = p.ratingAverage ? p.ratingAverage.toNumber() : null;

    const sharedCategories = p.categories.filter((c) => categoryIds.includes(c.categoryId)).length;
    const sharedTags = p.tags?.length ?? 0;
    const similarityScore = sharedCategories * 0.6 + sharedTags * 0.4;

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

    const reasons = buildRecommendationReasons({
      ratingAverage,
      hasStock,
      isSimilarToViewed: true,
      daysSinceCreated: this.daysSince(p.createdAt),
    });

    return {
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
    } as RankableItem;
  }

  private async mergeSemanticSimilarCandidates(
    sourceProductId: string,
    deterministicItems: RankableItem[],
    deterministicIds: string[],
    categoryIds: string[],
    ctx: RecommendationContextDto,
    userId: string | null,
  ): Promise<RankableItem[]> {
    let merged = deterministicItems;

    if (this.aiRanking?.enabled) {
      try {
        const semanticMatches = await this.aiRanking.findSimilarEntityIds(
          'product',
          sourceProductId,
          AI_CANDIDATE_LIMITS.semantic,
          [sourceProductId, ...deterministicIds],
        );

        const mergedIds = mergeCandidates(
          { deterministic: deterministicIds, semantic: semanticMatches.map((m) => m.entityId) },
          AI_CANDIDATE_LIMITS.merged,
        );

        const existing = new Set(deterministicIds);
        const extraIds = mergedIds.filter((id) => !existing.has(id));

        if (extraIds.length > 0) {
          const extras = await this.prisma.product.findMany({
            where: { id: { in: extraIds }, status: 'ACTIVE', deletedAt: null },
            select: {
              id: true,
              companyId: true,
              name: true,
              slug: true,
              imageUrl: true,
              ratingAverage: true,
              createdAt: true,
              categories: { select: { categoryId: true } },
              tags: { select: { tagId: true } },
              prices: { where: { validTo: null }, select: { value: true } },
              inventory: { select: { quantity: true } },
            },
          });

          merged = [
            ...deterministicItems,
            ...extras.map((p) => this.buildSimilarProductItem(p, categoryIds)),
          ];
        }
      } catch (error) {
        this.logger.warn(`Semantic candidate expansion failed: ${(error as Error).message}`);
        merged = deterministicItems;
      }
    }

    return this.applyAiRanking('product', merged, ctx, {
      userId,
      semanticEntityId: sourceProductId,
    });
  }

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

    const distanceByProduct = new Map<string, number>();
    if (ctx.lat !== undefined && ctx.lng !== undefined && storeIds.length > 0) {
      const distances = await this.computeProductDistances(
        products.map((p) => p.id),
        ctx.lat,
        ctx.lng,
      );
      for (const [id, value] of distances) distanceByProduct.set(id, value);
    }

    const items: RankableItem[] = [];
    const behavioralById = new Map<string, number>();

    for (const product of products) {
      const prices = product.prices.map((pr) => pr.value.toNumber());
      const minPrice = prices.length > 0 ? Math.min(...prices) : null;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
      const hasStock = product.inventory.some((i) => i.quantity > 0);
      const ratingAverage = product.ratingAverage ? product.ratingAverage.toNumber() : null;
      const popularity = popularityMap.get(product.id) ?? 0;
      const hasActiveOffer = offerProductIds.has(product.id);

      const distance = distanceByProduct.get(product.id) ?? null;

      const categoryIds = product.categories.map((c) => c.category.id);
      const categoryScore = computeCategoryAffinityScore(categoryIds, userAffinity.categoryAffinity);

      if (userAffinity.hasHistory && categoryScore > 0) {
        behavioralById.set(product.id, categoryScore);
      }
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
      } as RankableItem);
    }

    const ranked = await this.applyAiRanking('product', items, ctx, {
      userId: userId ?? null,
      behavioralById: userAffinity.hasHistory ? behavioralById : undefined,
    });

    const sorted = ranked
      .sort((a, b) => b._score - a._score);

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

    const items: RankableItem[] = [];

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
      } as RankableItem);
    }

    const ranked = await this.applyAiRanking('store', items, ctx, { userId: userId ?? null });

    const sorted = ranked
      .sort((a, b) => b._score - a._score);

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
    userId?: string | null,
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

    const items: RankableItem[] = [];

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
      } as RankableItem);
    }

    const ranked = await this.applyAiRanking('offer', items, ctx, { userId: userId ?? null });

    const sorted = ranked
      .sort((a, b) => b._score - a._score);

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
    userId?: string | null,
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

    const deterministicIds = similarProducts.map((p) => p.id);
    const deterministicItems: RankableItem[] = similarProducts.map((p) =>
      this.buildSimilarProductItem(p, categoryIds),
    );

    const ranked = await this.mergeSemanticSimilarCandidates(
      productId,
      deterministicItems,
      deterministicIds,
      categoryIds,
      ctx,
      userId ?? null,
    );

    const sorted = ranked
      .sort((a, b) => b._score - a._score);

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
    userId?: string | null,
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

    const items: RankableItem[] = [];

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
      } as RankableItem);
    }

    const ranked = await this.applyAiRanking('store', items, ctx, {
      userId: userId ?? null,
      semanticEntityId: storeId,
    });

    const sorted = ranked
      .sort((a, b) => b._score - a._score);

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

  private async computeProductDistances(
    productIds: string[],
    lat: number,
    lng: number,
  ): Promise<Map<string, number>> {
    if (productIds.length === 0) return new Map();

    const point = `POINT(${lng} ${lat})`;
    const rows = await this.prisma.$queryRaw<Array<{ product_id: string; distance: number }>>`
      SELECT ip.product_id,
        MIN(ST_Distance(s.location::geography, ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography)) as distance
      FROM inventory ip
      JOIN stores s ON s.id = ip.store_id AND s.deleted_at IS NULL
      WHERE ip.product_id = ANY(${productIds}::uuid[])
      GROUP BY ip.product_id
    `;

    return new Map(rows.map((row) => [row.product_id, Number(row.distance)]));
  }

  private daysSince(date: Date): number {
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  }
}
