import { cosineSimilarity, cosineToSemanticScore } from './cosine.js';

describe('cosine', () => {
  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 6);
    });

    it('returns 0 for orthogonal vectors', () => {
      expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
    });

    it('is scale invariant', () => {
      expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 6);
    });

    it('returns 0 when lengths differ', () => {
      expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    });

    it('returns 0 for zero vectors', () => {
      expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
    });
  });

  describe('cosineToSemanticScore', () => {
    it('clamps negative similarities to 0', () => {
      expect(cosineToSemanticScore(-0.7)).toBe(0);
    });

    it('keeps positives within [0, 1]', () => {
      expect(cosineToSemanticScore(0.42)).toBeCloseTo(0.42, 6);
      expect(cosineToSemanticScore(1.5)).toBe(1);
    });

    it('returns 0 for non-finite values', () => {
      expect(cosineToSemanticScore(Number.NaN)).toBe(0);
    });
  });
});
