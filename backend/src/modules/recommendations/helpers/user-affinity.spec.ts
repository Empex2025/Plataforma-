import { computeSearchRelevance, computeCategoryAffinityScore } from './user-affinity.js';

describe('User Affinity Helpers', () => {
  describe('computeSearchRelevance', () => {
    it('should return 0 for empty text', () => {
      expect(computeSearchRelevance('', ['test'])).toBe(0);
    });

    it('should return 0 for empty terms', () => {
      expect(computeSearchRelevance('test', [])).toBe(0);
    });

    it('should return 1 when text contains term', () => {
      expect(computeSearchRelevance('iPhone 15 Pro', ['iphone'])).toBe(1);
    });

    it('should be case insensitive', () => {
      expect(computeSearchRelevance('iPhone 15 Pro', ['IPHONE'])).toBe(1);
    });

    it('should return 0 when text does not contain term', () => {
      expect(computeSearchRelevance('Samsung Galaxy', ['iphone'])).toBe(0);
    });

    it('should return max relevance when multiple terms match', () => {
      const terms = ['iphone', 'samsung'];
      const result = computeSearchRelevance('iPhone 15', terms);
      expect(result).toBe(1);
    });
  });

  describe('computeCategoryAffinityScore', () => {
    it('should return 0 for empty affinity map', () => {
      const affinityMap = new Map<string, number>();
      expect(computeCategoryAffinityScore(['cat1'], affinityMap)).toBe(0);
    });

    it('should return 0 for empty categories', () => {
      const affinityMap = new Map([['cat1', 5]]);
      expect(computeCategoryAffinityScore([], affinityMap)).toBe(0);
    });

    it('should return 0 when no matching categories', () => {
      const affinityMap = new Map([['cat1', 5]]);
      expect(computeCategoryAffinityScore(['cat2'], affinityMap)).toBe(0);
    });

    it('should compute score based on matching categories', () => {
      const affinityMap = new Map([
        ['cat1', 5],
        ['cat2', 3],
      ]);
      const result = computeCategoryAffinityScore(['cat1'], affinityMap);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should clamp score to 1', () => {
      const affinityMap = new Map([['cat1', 100]]);
      const result = computeCategoryAffinityScore(['cat1'], affinityMap);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should handle multiple matching categories', () => {
      const affinityMap = new Map([
        ['cat1', 5],
        ['cat2', 3],
      ]);
      const result = computeCategoryAffinityScore(['cat1', 'cat2'], affinityMap);
      expect(result).toBeGreaterThan(0);
    });
  });
});
