import { twoProportionZTest } from './z-test.helpers.js';

describe('twoProportionZTest', () => {
  it('returns p close to 1 for equal proportions', () => {
    const result = twoProportionZTest(100, 1000, 100, 1000)!;
    expect(result.z).toBeCloseTo(0, 9);
    expect(result.pValue).toBeCloseTo(1, 6);
  });

  it('detects a large difference as significant', () => {
    const result = twoProportionZTest(100, 1000, 200, 1000)!;
    expect(result.pValue).toBeLessThan(0.001);
    expect(result.pValue).toBeGreaterThan(0);
    expect(result.z).toBeGreaterThan(0);
  });

  it('does not flag a small difference as significant', () => {
    const result = twoProportionZTest(100, 1000, 105, 1000)!;
    expect(result.pValue).toBeGreaterThan(0.05);
  });

  it('keeps p-value within [0, 1]', () => {
    const result = twoProportionZTest(0, 1000, 1000, 1000)!;
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
  });

  it('returns null for zero-variance or invalid samples', () => {
    expect(twoProportionZTest(0, 100, 0, 100)).toBeNull();
    expect(twoProportionZTest(100, 100, 100, 100)).toBeNull();
    expect(twoProportionZTest(1, 0, 1, 100)).toBeNull();
    expect(twoProportionZTest(Number.NaN, 100, 1, 100)).toBeNull();
  });
});
