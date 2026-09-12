import {
  computeRankingScore,
  normalize,
  invertNormalize,
  decayByDays,
  type SignalScores,
} from './discovery-ranking.js';
import { DISCOVERY_WEIGHTS } from '../discovery.constants.js';

describe('discovery-ranking', () => {
  describe('computeRankingScore', () => {
    it('should return 0 when all signals are 0', () => {
      const signals: SignalScores = {
        textRelevance: 0,
        availability: 0,
        proximity: 0,
        price: 0,
        popularity: 0,
        rating: 0,
        recency: 0,
      };
      expect(computeRankingScore(signals)).toBe(0);
    });

    it('should return 1 when all signals are 1', () => {
      const signals: SignalScores = {
        textRelevance: 1,
        availability: 1,
        proximity: 1,
        price: 1,
        popularity: 1,
        rating: 1,
        recency: 1,
      };
      const total = Object.values(DISCOVERY_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(computeRankingScore(signals)).toBeCloseTo(total, 10);
    });

    it('should apply weights to each signal', () => {
      const signals: SignalScores = {
        textRelevance: 1,
        availability: 0,
        proximity: 0,
        price: 0,
        popularity: 0,
        rating: 0,
        recency: 0,
      };
      expect(computeRankingScore(signals)).toBeCloseTo(DISCOVERY_WEIGHTS.textRelevance, 10);
    });
  });

  describe('normalize', () => {
    it('should return 0.5 when min equals max', () => {
      expect(normalize(5, 5, 5)).toBe(0.5);
    });

    it('should clamp below min to 0', () => {
      expect(normalize(-1, 0, 10)).toBe(0);
    });

    it('should clamp above max to 1', () => {
      expect(normalize(11, 0, 10)).toBe(1);
    });

    it('should linearly interpolate', () => {
      expect(normalize(5, 0, 10)).toBe(0.5);
    });
  });

  describe('invertNormalize', () => {
    it('should invert the normalized value', () => {
      expect(invertNormalize(0, 0, 10)).toBe(1);
      expect(invertNormalize(10, 0, 10)).toBe(0);
      expect(invertNormalize(5, 0, 10)).toBe(0.5);
    });
  });

  describe('decayByDays', () => {
    it('should return 1 at day 0', () => {
      expect(decayByDays(0, 7)).toBe(1);
    });

    it('should return 0.5 at one half-life', () => {
      expect(decayByDays(7, 7)).toBeCloseTo(0.5, 10);
    });

    it('should return 0.25 at two half-lives', () => {
      expect(decayByDays(14, 7)).toBeCloseTo(0.25, 10);
    });

    it('should decay toward 0 for large values', () => {
      expect(decayByDays(1000, 7)).toBeLessThan(0.001);
    });
  });
});
