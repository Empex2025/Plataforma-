import { computeRecommendationScore, normalize, invertNormalize, decayByDays, type RecommendationSignalScores } from './recommendation-ranking.js';
import { RECOMMENDATION_WEIGHTS } from '../recommendations.constants.js';

describe('Recommendation Ranking Helpers', () => {
  describe('normalize', () => {
    it('should normalize value to 0-1 range', () => {
      expect(normalize(5, 0, 10)).toBe(0.5);
      expect(normalize(0, 0, 10)).toBe(0);
      expect(normalize(10, 0, 10)).toBe(1);
    });

    it('should clamp to 0-1', () => {
      expect(normalize(-5, 0, 10)).toBe(0);
      expect(normalize(15, 0, 10)).toBe(1);
    });

    it('should return 0.5 when min equals max', () => {
      expect(normalize(5, 5, 5)).toBe(0.5);
    });
  });

  describe('invertNormalize', () => {
    it('should invert normalized value', () => {
      expect(invertNormalize(5, 0, 10)).toBe(0.5);
      expect(invertNormalize(0, 0, 10)).toBe(1);
      expect(invertNormalize(10, 0, 10)).toBe(0);
    });
  });

  describe('decayByDays', () => {
    it('should return 1 for 0 days', () => {
      expect(decayByDays(0, 7)).toBe(1);
    });

    it('should return 0.5 at halfLife', () => {
      expect(decayByDays(7, 7)).toBeCloseTo(0.5);
    });

    it('should decay over time', () => {
      const result = decayByDays(14, 7);
      expect(result).toBeLessThan(0.5);
    });

    it('should return 0 when halfLife is 0', () => {
      expect(decayByDays(5, 0)).toBe(0);
    });
  });

  describe('computeRecommendationScore', () => {
    it('should compute score with all signals', () => {
      const signals: RecommendationSignalScores = {
        textRelevance: 1,
        availability: 1,
        proximity: 1,
        price: 1,
        popularity: 1,
        rating: 1,
        recency: 1,
        onSale: 1,
        userAffinity: 1,
      };

      const score = computeRecommendationScore(signals);
      expect(score).toBeCloseTo(1);
    });

    it('should compute score with zero userAffinity (redistribution)', () => {
      const signals: RecommendationSignalScores = {
        textRelevance: 1,
        availability: 1,
        proximity: 1,
        price: 1,
        popularity: 1,
        rating: 1,
        recency: 1,
        onSale: 1,
        userAffinity: 0,
      };

      const score = computeRecommendationScore(signals);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should return 0 for all zero signals', () => {
      const signals: RecommendationSignalScores = {
        textRelevance: 0,
        availability: 0,
        proximity: 0,
        price: 0,
        popularity: 0,
        rating: 0,
        recency: 0,
        onSale: 0,
        userAffinity: 0,
      };

      const score = computeRecommendationScore(signals);
      expect(score).toBe(0);
    });

    it('should weight signals according to RECOMMENDATION_WEIGHTS when userAffinity is present', () => {
      const signals: RecommendationSignalScores = {
        textRelevance: 1,
        availability: 0,
        proximity: 0,
        price: 0,
        popularity: 0,
        rating: 0,
        recency: 0,
        onSale: 0,
        userAffinity: 1,
      };

      const score = computeRecommendationScore(signals);
      expect(score).toBeCloseTo(RECOMMENDATION_WEIGHTS.textRelevance + RECOMMENDATION_WEIGHTS.userAffinity);
    });

    it('should redistribute userAffinity weight when userAffinity is 0', () => {
      const signalsNoAffinity: RecommendationSignalScores = {
        textRelevance: 1,
        availability: 0,
        proximity: 0,
        price: 0,
        popularity: 0,
        rating: 0,
        recency: 0,
        onSale: 0,
        userAffinity: 0,
      };

      const signalsWithAffinity: RecommendationSignalScores = {
        ...signalsNoAffinity,
        userAffinity: 1,
      };

      const scoreWithout = computeRecommendationScore(signalsNoAffinity);
      const scoreWith = computeRecommendationScore(signalsWithAffinity);

      expect(scoreWithout).toBeGreaterThan(0);
      expect(scoreWith).toBeGreaterThan(0);
      expect(scoreWithout).not.toBeCloseTo(scoreWith);
    });
  });
});
