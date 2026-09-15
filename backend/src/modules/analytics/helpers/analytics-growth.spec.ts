import { computeGrowth, computeGrowthMap } from './analytics-growth.js';

describe('Analytics Growth Helpers', () => {
  describe('computeGrowth', () => {
    it('should compute positive growth', () => {
      const result = computeGrowth(120, 100);
      expect(result.absolute).toBe(20);
      expect(result.percentage).toBe(20);
    });

    it('should compute negative growth', () => {
      const result = computeGrowth(80, 100);
      expect(result.absolute).toBe(-20);
      expect(result.percentage).toBe(-20);
    });

    it('should return percentage null when previous is 0 and current > 0', () => {
      const result = computeGrowth(50, 0);
      expect(result.absolute).toBe(50);
      expect(result.percentage).toBeNull();
    });

    it('should return percentage 0 when both are 0', () => {
      const result = computeGrowth(0, 0);
      expect(result.absolute).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('should return percentage 0 when values are equal', () => {
      const result = computeGrowth(100, 100);
      expect(result.absolute).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('should handle large numbers', () => {
      const result = computeGrowth(1000000, 500000);
      expect(result.absolute).toBe(500000);
      expect(result.percentage).toBe(100);
    });

    it('should round percentage to 2 decimals', () => {
      const result = computeGrowth(33, 100);
      expect(result.percentage).toBe(-67);
    });
  });

  describe('computeGrowthMap', () => {
    it('should compute growth for multiple keys', () => {
      const current = { views: 120, favorites: 50, contacts: 10 };
      const previous = { views: 100, favorites: 40, contacts: 10 };

      const result = computeGrowthMap(current, previous);

      expect(result.views.absolute).toBe(20);
      expect(result.views.percentage).toBe(20);
      expect(result.favorites.absolute).toBe(10);
      expect(result.favorites.percentage).toBe(25);
      expect(result.contacts.absolute).toBe(0);
      expect(result.contacts.percentage).toBe(0);
    });

    it('should handle missing keys in current', () => {
      const current = { views: 100 };
      const previous = { views: 80, favorites: 20 };

      const result = computeGrowthMap(current, previous);

      expect(result.views.absolute).toBe(20);
      expect(result.favorites.absolute).toBe(-20);
    });

    it('should handle missing keys in previous', () => {
      const current = { views: 100, contacts: 5 };
      const previous = { views: 80 };

      const result = computeGrowthMap(current, previous);

      expect(result.views.absolute).toBe(20);
      expect(result.contacts.absolute).toBe(5);
      expect(result.contacts.percentage).toBeNull();
    });

    it('should handle empty maps', () => {
      const result = computeGrowthMap({}, {});
      expect(Object.keys(result)).toHaveLength(0);
    });
  });
});
