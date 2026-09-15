import { PrismaService } from '@/db/prisma.service.js';
import { EventType } from '@/generated/prisma/enums.js';
import { EVENT_WEIGHTS, RECOMMENDATION_THRESHOLDS } from '../recommendations.constants.js';

export interface UserAffinityData {
  searchTerms: string[];
  viewedProductIds: string[];
  viewedStoreIds: string[];
  favoritedProductIds: string[];
  favoritedStoreIds: string[];
  categoryAffinity: Map<string, number>;
  hasHistory: boolean;
}

export async function buildUserAffinity(
  prisma: PrismaService,
  userId: string | null,
): Promise<UserAffinityData> {
  const empty: UserAffinityData = {
    searchTerms: [],
    viewedProductIds: [],
    viewedStoreIds: [],
    favoritedProductIds: [],
    favoritedStoreIds: [],
    categoryAffinity: new Map(),
    hasHistory: false,
  };

  if (!userId) return empty;

  const since = new Date();
  since.setDate(since.getDate() - RECOMMENDATION_THRESHOLDS.userAffinityWindowDays);

  const events = await prisma.event.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { type: true, targetType: true, targetId: true, metadata: true },
  });

  if (events.length === 0) return empty;

  const searchTerms = new Set<string>();
  const viewedProductIds = new Set<string>();
  const viewedStoreIds = new Set<string>();
  const favoritedProductIds = new Set<string>();
  const favoritedStoreIds = new Set<string>();
  const categoryCounts = new Map<string, number>();

  for (const event of events) {
    if (event.type === EventType.SEARCH && event.metadata) {
      const meta = event.metadata as Record<string, unknown>;
      if (typeof meta.query === 'string' && meta.query.trim()) {
        searchTerms.add(meta.query.trim().toLowerCase());
      }
    }

    if (event.type === EventType.PRODUCT_VIEW && event.targetId) {
      viewedProductIds.add(event.targetId);
    }

    if (event.type === EventType.STORE_VIEW && event.targetId) {
      viewedStoreIds.add(event.targetId);
    }

    if (event.type === EventType.PRODUCT_FAVORITE && event.targetId) {
      favoritedProductIds.add(event.targetId);
    }

    if (event.type === EventType.STORE_FAVORITE && event.targetId) {
      favoritedStoreIds.add(event.targetId);
    }
  }

  const allProductIds = [...new Set([...viewedProductIds, ...favoritedProductIds])];
  if (allProductIds.length > 0) {
    const productCategories = await prisma.productCategory.findMany({
      where: { productId: { in: allProductIds } },
      select: { categoryId: true, product: { select: { id: true } } },
    });

    for (const pc of productCategories) {
      const isFavorited = favoritedProductIds.has(pc.product.id);
      const weight = isFavorited ? EVENT_WEIGHTS.favorite : EVENT_WEIGHTS.view;
      categoryCounts.set(pc.categoryId, (categoryCounts.get(pc.categoryId) ?? 0) + weight);
    }
  }

  const hasHistory = events.length >= RECOMMENDATION_THRESHOLDS.minEventsForAffinity;

  return {
    searchTerms: [...searchTerms],
    viewedProductIds: [...viewedProductIds],
    viewedStoreIds: [...viewedStoreIds],
    favoritedProductIds: [...favoritedProductIds],
    favoritedStoreIds: [...favoritedStoreIds],
    categoryAffinity: categoryCounts,
    hasHistory,
  };
}

export function computeSearchRelevance(text: string, terms: string[]): number {
  if (!text || terms.length === 0) return 0;

  const lowerText = text.toLowerCase();
  let maxRelevance = 0;

  for (const term of terms) {
    if (lowerText.includes(term.toLowerCase())) {
      maxRelevance = Math.max(maxRelevance, 1);
    }
  }

  return maxRelevance;
}

export function computeCategoryAffinityScore(
  productCategories: string[],
  affinityMap: Map<string, number>,
): number {
  if (affinityMap.size === 0 || productCategories.length === 0) return 0;

  let totalWeight = 0;
  for (const catId of productCategories) {
    totalWeight += affinityMap.get(catId) ?? 0;
  }

  const maxPossible = Math.max(...affinityMap.values()) * productCategories.length;
  if (maxPossible === 0) return 0;

  return Math.min(1, totalWeight / maxPossible);
}
