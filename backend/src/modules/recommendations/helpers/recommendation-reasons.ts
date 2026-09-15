import { RecommendationReasonCode, REASON_LABELS, RECOMMENDATION_THRESHOLDS } from '../recommendations.constants.js';

export interface RecommendationReasonDto {
  code: RecommendationReasonCode;
  label: string;
}

export interface RecommendationReasonContext {
  distance?: number | null;
  ratingAverage?: number | null;
  hasStock?: boolean;
  hasActiveOffer?: boolean;
  popularityScore?: number;
  daysSinceCreated?: number;
  hasSearchQuery?: boolean;
  hasUserFavorites?: boolean;
  isSimilarToViewed?: boolean;
  categoryAffinity?: boolean;
  discountPercentage?: number | null;
}

export function buildRecommendationReasons(ctx: RecommendationReasonContext): RecommendationReasonDto[] {
  const reasons: RecommendationReasonDto[] = [];

  if (ctx.distance !== undefined && ctx.distance !== null && ctx.distance < RECOMMENDATION_THRESHOLDS.nearbyDistance) {
    reasons.push({ code: RecommendationReasonCode.NEARBY, label: REASON_LABELS[RecommendationReasonCode.NEARBY] });
  }

  if (ctx.ratingAverage !== undefined && ctx.ratingAverage !== null && ctx.ratingAverage >= RECOMMENDATION_THRESHOLDS.highRating) {
    reasons.push({ code: RecommendationReasonCode.HIGH_RATING, label: REASON_LABELS[RecommendationReasonCode.HIGH_RATING] });
  }

  if (ctx.popularityScore !== undefined && ctx.popularityScore > 0) {
    reasons.push({ code: RecommendationReasonCode.POPULAR, label: REASON_LABELS[RecommendationReasonCode.POPULAR] });
  }

  if (ctx.hasStock === true) {
    reasons.push({ code: RecommendationReasonCode.AVAILABLE, label: REASON_LABELS[RecommendationReasonCode.AVAILABLE] });
  }

  if (ctx.hasActiveOffer === true) {
    reasons.push({ code: RecommendationReasonCode.ON_SALE, label: REASON_LABELS[RecommendationReasonCode.ON_SALE] });
  }

  if (ctx.daysSinceCreated !== undefined && ctx.daysSinceCreated <= 7) {
    reasons.push({ code: RecommendationReasonCode.RECENT, label: REASON_LABELS[RecommendationReasonCode.RECENT] });
  }

  if (ctx.hasSearchQuery === true) {
    reasons.push({ code: RecommendationReasonCode.BASED_ON_SEARCH, label: REASON_LABELS[RecommendationReasonCode.BASED_ON_SEARCH] });
  }

  if (ctx.hasUserFavorites === true) {
    reasons.push({ code: RecommendationReasonCode.BASED_ON_FAVORITES, label: REASON_LABELS[RecommendationReasonCode.BASED_ON_FAVORITES] });
  }

  if (ctx.isSimilarToViewed === true) {
    reasons.push({ code: RecommendationReasonCode.SIMILAR_ITEM, label: REASON_LABELS[RecommendationReasonCode.SIMILAR_ITEM] });
  }

  if (ctx.categoryAffinity === true) {
    reasons.push({ code: RecommendationReasonCode.CATEGORY_AFFINITY, label: REASON_LABELS[RecommendationReasonCode.CATEGORY_AFFINITY] });
  }

  if (ctx.discountPercentage !== undefined && ctx.discountPercentage !== null && ctx.discountPercentage >= RECOMMENDATION_THRESHOLDS.discountMedium) {
    reasons.push({ code: RecommendationReasonCode.HIGH_DISCOUNT, label: REASON_LABELS[RecommendationReasonCode.HIGH_DISCOUNT] });
  }

  return reasons;
}
