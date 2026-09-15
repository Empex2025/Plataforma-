import { erf, inverseNormalCdf, normalCdf, zScoreForConfidence } from './normal.helpers.js';

describe('erf / normalCdf', () => {
  it('computes known erf values', () => {
    expect(erf(0)).toBeCloseTo(0, 6);
    expect(erf(1)).toBeCloseTo(0.84270079, 6);
    expect(erf(-1)).toBeCloseTo(-0.84270079, 6);
  });

  it('computes known normal CDF values', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.959964)).toBeCloseTo(0.975, 5);
    expect(normalCdf(-1.959964)).toBeCloseTo(0.025, 5);
  });

  it('handles non-finite input safely', () => {
    expect(normalCdf(Number.POSITIVE_INFINITY)).toBe(1);
    expect(normalCdf(Number.NEGATIVE_INFINITY)).toBe(0);
    expect(normalCdf(Number.NaN)).toBe(0.5);
    expect(erf(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe('inverseNormalCdf', () => {
  it('computes known quantiles', () => {
    expect(inverseNormalCdf(0.5)).toBeCloseTo(0, 6);
    expect(inverseNormalCdf(0.975)).toBeCloseTo(1.959964, 6);
    expect(inverseNormalCdf(0.025)).toBeCloseTo(-1.959964, 6);
    expect(inverseNormalCdf(0.995)).toBeCloseTo(2.575829, 5);
  });

  it('returns null outside (0, 1)', () => {
    expect(inverseNormalCdf(0)).toBeNull();
    expect(inverseNormalCdf(1)).toBeNull();
    expect(inverseNormalCdf(-0.1)).toBeNull();
    expect(inverseNormalCdf(Number.NaN)).toBeNull();
  });
});

describe('zScoreForConfidence', () => {
  it('maps confidence levels to two-sided z-scores', () => {
    expect(zScoreForConfidence(0.95)).toBeCloseTo(1.959964, 6);
    expect(zScoreForConfidence(0.9)).toBeCloseTo(1.644854, 5);
    expect(zScoreForConfidence(0.99)).toBeCloseTo(2.575829, 5);
  });

  it('returns null for invalid confidence levels', () => {
    expect(zScoreForConfidence(0)).toBeNull();
    expect(zScoreForConfidence(1)).toBeNull();
    expect(zScoreForConfidence(1.5)).toBeNull();
    expect(zScoreForConfidence(Number.NaN)).toBeNull();
  });
});
