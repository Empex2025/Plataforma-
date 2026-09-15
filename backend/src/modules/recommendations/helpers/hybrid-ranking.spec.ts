import { combineHybridScore, clamp01 } from './hybrid-ranking.js';
import { AI_RECOMMENDATION_WEIGHTS } from '../ai-recommendation.constants.js';

describe('combineHybridScore', () => {
  it('combines all components with the configured weights', () => {
    const score = combineHybridScore({ deterministic: 1, semantic: 1, behavioral: 1 });
    expect(score).toBeCloseTo(1, 6);

    const expected =
      0.5 * 0.5 + 0.3 * 0.5 + 0.2 * 0.5;
    expect(combineHybridScore({ deterministic: 0.5, semantic: 0.5, behavioral: 0.5 }))
      .toBeCloseTo(expected, 6);
  });

  it('redistributes the weight when a component is unavailable', () => {
    expect(combineHybridScore({ deterministic: 0.8 })).toBeCloseTo(0.8, 6);

    const value = combineHybridScore({ deterministic: 1, semantic: 0 });
    expect(value).toBeCloseTo(0.5 / 0.8, 6);
  });

  it('clamps components to [0, 1]', () => {
    expect(combineHybridScore({ deterministic: 2 })).toBe(1);
    expect(combineHybridScore({ deterministic: -2 })).toBe(0);
  });

  it('ignores non-finite components', () => {
    expect(combineHybridScore({ deterministic: 0.5, semantic: Number.NaN })).toBeCloseTo(0.5, 6);
  });

  it('returns 0 when no component is available', () => {
    expect(combineHybridScore({})).toBe(0);
  });

  it('keeps the Fase 17 weights untouched', () => {
    expect(AI_RECOMMENDATION_WEIGHTS.deterministic).toBe(0.5);
    expect(AI_RECOMMENDATION_WEIGHTS.semantic).toBe(0.3);
    expect(AI_RECOMMENDATION_WEIGHTS.behavioral).toBe(0.2);
  });
});

describe('clamp01', () => {
  it('clamps values', () => {
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(1.4)).toBe(1);
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
