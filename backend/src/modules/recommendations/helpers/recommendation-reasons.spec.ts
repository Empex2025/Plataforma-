import { buildRecommendationReasons, type RecommendationReasonContext } from './recommendation-reasons.js';
import { RecommendationReasonCode, RECOMMENDATION_THRESHOLDS } from '../recommendations.constants.js';

describe('Recommendation Reasons', () => {
  describe('buildRecommendationReasons', () => {
    it('should return empty array for empty context', () => {
      const ctx: RecommendationReasonContext = {};
      const reasons = buildRecommendationReasons(ctx);
      expect(reasons).toEqual([]);
    });

    it('should add NEARBY when distance is less than threshold', () => {
      const ctx: RecommendationReasonContext = {
        distance: RECOMMENDATION_THRESHOLDS.nearbyDistance - 1000,
      };
      const reasons = buildRecommendationReasons(ctx);
      expect(reasons).toHaveLength(1);
      expect(reasons[0].code).toBe(RecommendationReasonCode.NEARBY);
    });

    it('should not add NEARBY when distance is greater than threshold', () => {
      const ctx: RecommendationReasonContext = {
        distance: RECOMMENDATION_THRESHOLDS.nearbyDistance + 1000,
      };
      const reasons = buildRecommendationReasons(ctx);
      expect(reasons).toHaveLength(0);
    });

    it('should add HIGH_RATING when rating is above threshold', () => {
      const ctx: RecommendationReasonContext = {
        ratingAverage: RECOMMENDATION_THRESHOLDS.highRating,
      };
      const reasons = buildRecommendationReasons(ctx);
      expect(reasons).toHaveLength(1);
      expect(reasons[0].code).toBe(RecommendationReasonCode.HIGH_RATING);
    });

    it('should not add HIGH_RATING when rating is below threshold', () => {
      const ctx: RecommendationReasonContext = {
        ratingAverage: RECOMMENDATION_THRESHOLDS.highRating - 0.5,
      };
      const reasons = buildRecommendationReasons(ctx);
      expect(reasons).toHaveLength(0);
    });

    it('should add POPULAR when popularityScore is greater than 0', () => {
      const ctx: RecommendationReasonContext = {
        popularityScore: 5,
      };
      const reasons = buildRecommendationReasons(ctx);
      expect(reasons).toHaveLength(1);
      expect(reasons[0].code).toBe(RecommendationReasonCode.POPULAR);
    });

    it('should add AVAILABLE when hasStock is true', () => {
      const ctx: RecommendationReasonContext = {
        hasStock: true,
      };
      const reasons = buildRecommendationReasons(ctx);
      expect(reasons).toHaveLength(1);
      expect(reasons[0].code).toBe(RecommendationReasonCode.AVAILABLE);
    });

    it('should add ON_SALE when hasActiveOffer is true', () => {
      const ctx: RecommendationReasonContext = {
        hasActiveOffer: true,
      };
      const reasons = buildRecommendationReasons(ctx);
      expect(reasons).toHaveLength(1);
      expect(reasons[0].code).toBe(RecommendationReasonCode.ON_SALE);
    });

    it('should add RECENT when daysSinceCreated is 7 or less', () => {
      const ctx: RecommendationReasonContext = {
        daysSinceCreated: 7,
      };
      const reasons = buildRecommendationReasons(ctx);
      expect(reasons).toHaveLength(1);
      expect(reasons[0].code).toBe(RecommendationReasonCode.RECENT);
    });

    it('should add BASED_ON_SEARCH when hasSearchQuery is true', () => {
      const ctx: RecommendationReasonContext = {
        hasSearchQuery: true,
      };
      const reasons = buildRecommendationReasons(ctx);
      expect(reasons).toHaveLength(1);
      expect(reasons[0].code).toBe(RecommendationReasonCode.BASED_ON_SEARCH);
    });

    it('should add BASED_ON_FAVORITES when hasUserFavorites is true', () => {
      const ctx: RecommendationReasonContext = {
        hasUserFavorites: true,
      };
      const reasons = buildRecommendationReasons(ctx);
      expect(reasons).toHaveLength(1);
      expect(reasons[0].code).toBe(RecommendationReasonCode.BASED_ON_FAVORITES);
    });

    it('should add SIMILAR_ITEM when isSimilarToViewed is true', () => {
      const ctx: RecommendationReasonContext = {
        isSimilarToViewed: true,
      };
      const reasons = buildRecommendationReasons(ctx);
      expect(reasons).toHaveLength(1);
      expect(reasons[0].code).toBe(RecommendationReasonCode.SIMILAR_ITEM);
    });

    it('should add CATEGORY_AFFINITY when categoryAffinity is true', () => {
      const ctx: RecommendationReasonContext = {
        categoryAffinity: true,
      };
      const reasons = buildRecommendationReasons(ctx);
      expect(reasons).toHaveLength(1);
      expect(reasons[0].code).toBe(RecommendationReasonCode.CATEGORY_AFFINITY);
    });

    it('should add HIGH_DISCOUNT when discount is above threshold', () => {
      const ctx: RecommendationReasonContext = {
        discountPercentage: RECOMMENDATION_THRESHOLDS.discountMedium,
      };
      const reasons = buildRecommendationReasons(ctx);
      expect(reasons).toHaveLength(1);
      expect(reasons[0].code).toBe(RecommendationReasonCode.HIGH_DISCOUNT);
    });

    it('should add multiple reasons when context has multiple signals', () => {
      const ctx: RecommendationReasonContext = {
        distance: 1000,
        ratingAverage: 4.5,
        hasStock: true,
        hasActiveOffer: true,
      };
      const reasons = buildRecommendationReasons(ctx);
      expect(reasons.length).toBeGreaterThanOrEqual(4);
      const codes = reasons.map((r) => r.code);
      expect(codes).toContain(RecommendationReasonCode.NEARBY);
      expect(codes).toContain(RecommendationReasonCode.HIGH_RATING);
      expect(codes).toContain(RecommendationReasonCode.AVAILABLE);
      expect(codes).toContain(RecommendationReasonCode.ON_SALE);
    });

    it('should have labels for all reasons', () => {
      const ctx: RecommendationReasonContext = {
        distance: 1000,
        ratingAverage: 4.5,
        hasStock: true,
        hasActiveOffer: true,
        popularityScore: 5,
        daysSinceCreated: 3,
        hasSearchQuery: true,
        hasUserFavorites: true,
        isSimilarToViewed: true,
        categoryAffinity: true,
        discountPercentage: 25,
      };
      const reasons = buildRecommendationReasons(ctx);
      for (const reason of reasons) {
        expect(reason.label).toBeTruthy();
        expect(typeof reason.label).toBe('string');
      }
    });
  });
});
