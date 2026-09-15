import { wilsonInterval } from './wilson.helpers.js';

describe('wilsonInterval', () => {
  it('computes a symmetric interval for p = 0.5', () => {
    const interval = wilsonInterval(50, 100, 0.95)!;
    expect(interval.estimate).toBeCloseTo(0.5, 9);
    expect(interval.lower).toBeCloseTo(0.4038, 3);
    expect(interval.upper).toBeCloseTo(0.5962, 3);
  });

  it('handles zero successes (lower bound is 0)', () => {
    const interval = wilsonInterval(0, 100, 0.95)!;
    expect(interval.estimate).toBe(0);
    expect(interval.lower).toBe(0);
    expect(interval.upper).toBeCloseTo(0.037, 2);
  });

  it('handles all successes (upper bound is 1)', () => {
    const interval = wilsonInterval(100, 100, 0.95)!;
    expect(interval.estimate).toBe(1);
    expect(interval.upper).toBe(1);
    expect(interval.lower).toBeCloseTo(0.963, 2);
  });

  it('narrows as the sample grows', () => {
    const small = wilsonInterval(5, 10, 0.95)!;
    const large = wilsonInterval(500, 1000, 0.95)!;
    expect(large.upper - large.lower).toBeLessThan(small.upper - small.lower);
  });

  it('returns null for a non-positive sample or invalid confidence', () => {
    expect(wilsonInterval(0, 0, 0.95)).toBeNull();
    expect(wilsonInterval(1, -5, 0.95)).toBeNull();
    expect(wilsonInterval(-1, 10, 0.95)).toBeNull();
    expect(wilsonInterval(5, 10, 2)).toBeNull();
    expect(wilsonInterval(Number.NaN, 10, 0.95)).toBeNull();
  });

  it('always stays within [0, 1] and finite', () => {
    for (const [successes, total] of [
      [0, 1],
      [1, 1],
      [1, 3],
      [999, 1000],
    ]) {
      const interval = wilsonInterval(successes, total, 0.95)!;
      for (const value of [interval.estimate, interval.lower, interval.upper]) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
      expect(interval.lower).toBeLessThanOrEqual(interval.upper);
    }
  });
});
