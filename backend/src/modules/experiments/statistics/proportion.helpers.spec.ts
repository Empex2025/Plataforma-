import { relativeLift, safeRatio } from './proportion.helpers.js';

describe('safeRatio', () => {
  it('divides valid operands', () => {
    expect(safeRatio(1, 2)).toBe(0.5);
    expect(safeRatio(0, 5)).toBe(0);
  });

  it('returns null for invalid denominators', () => {
    expect(safeRatio(1, 0)).toBeNull();
    expect(safeRatio(1, -2)).toBeNull();
  });

  it('returns null for non-finite operands', () => {
    expect(safeRatio(Number.NaN, 2)).toBeNull();
    expect(safeRatio(Number.POSITIVE_INFINITY, 2)).toBeNull();
    expect(safeRatio(1, Number.NaN)).toBeNull();
  });
});

describe('relativeLift', () => {
  it('computes a positive lift as a fraction', () => {
    expect(relativeLift(0.05, 0.06)).toBeCloseTo(0.2, 6);
  });

  it('computes a negative lift', () => {
    expect(relativeLift(0.05, 0.04)).toBeCloseTo(-0.2, 6);
  });

  it('returns null when the control rate is zero', () => {
    expect(relativeLift(0, 0.1)).toBeNull();
  });

  it('returns null for null or invalid inputs', () => {
    expect(relativeLift(null, 0.1)).toBeNull();
    expect(relativeLift(0.1, null)).toBeNull();
    expect(relativeLift(Number.NaN, 0.1)).toBeNull();
  });
});
