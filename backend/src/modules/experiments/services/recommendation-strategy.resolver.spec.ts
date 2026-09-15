import { jest } from '@jest/globals';
import { RecommendationStrategyResolver } from './recommendation-strategy.resolver.js';

function makeAssignments(result: unknown) {
  return { assignActiveInDomain: jest.fn(async () => result) };
}

describe('RecommendationStrategyResolver', () => {
  it('returns null for anonymous users (authenticated-only v1)', async () => {
    const assignments = makeAssignments(null);
    const resolver = new RecommendationStrategyResolver(assignments as never);

    await expect(resolver.resolve(null)).resolves.toBeNull();
    expect(assignments.assignActiveInDomain).not.toHaveBeenCalled();
  });

  it('maps the variant config to the hybrid strategy', async () => {
    const assignments = makeAssignments({
      experimentKey: 'recommendation-ranking-v1',
      variantKey: 'TREATMENT',
      config: { recommendation_mode: 'hybrid' },
    });
    const resolver = new RecommendationStrategyResolver(assignments as never);

    const result = await resolver.resolve('user-1');

    expect(result).toEqual({
      strategy: 'hybrid',
      experimentKey: 'recommendation-ranking-v1',
      variantKey: 'TREATMENT',
    });
  });

  it('maps the variant config to the deterministic strategy', async () => {
    const assignments = makeAssignments({
      experimentKey: 'recommendation-ranking-v1',
      variantKey: 'CONTROL',
      config: { recommendation_mode: 'deterministic' },
    });
    const resolver = new RecommendationStrategyResolver(assignments as never);

    await expect(resolver.resolve('user-1')).resolves.toEqual({
      strategy: 'deterministic',
      experimentKey: 'recommendation-ranking-v1',
      variantKey: 'CONTROL',
    });
  });

  it('returns null when there is no assignment', async () => {
    const resolver = new RecommendationStrategyResolver(makeAssignments(null) as never);
    await expect(resolver.resolve('user-1')).resolves.toBeNull();
  });

  it('returns null for an invalid or missing recommendation_mode', async () => {
    const resolver = new RecommendationStrategyResolver(
      makeAssignments({ experimentKey: 'x', variantKey: 'CONTROL', config: { other: true } }) as never,
    );
    await expect(resolver.resolve('user-1')).resolves.toBeNull();
  });

  it('swallows assignment errors and returns null', async () => {
    const assignments = { assignActiveInDomain: jest.fn(async () => { throw new Error('db down'); }) };
    const resolver = new RecommendationStrategyResolver(assignments as never);

    await expect(resolver.resolve('user-1')).resolves.toBeNull();
  });
});
