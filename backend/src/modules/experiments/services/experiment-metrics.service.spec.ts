import { jest } from '@jest/globals';
import { ExperimentMetricsService } from './experiment-metrics.service.js';

const EXPERIMENT = {
  id: 'exp-1',
  key: 'recommendation-ranking-v1',
  domain: 'recommendation',
  name: 'Recommendation Ranking',
  status: 'RUNNING',
  startAt: null,
  endAt: null,
  variants: [
    { id: 'v-control', key: 'CONTROL', name: 'Control', allocation: 50 },
    { id: 'v-treatment', key: 'TREATMENT', name: 'Treatment', allocation: 50 },
  ],
};

function makePrisma(overrides: {
  experiment?: unknown;
  samples?: Array<{ variantId: string; _count: { _all: number } }>;
  counts?: Array<{ variant_id: string; type: string; count: bigint }>;
} = {}) {
  return {
    experiment: { findUnique: jest.fn(async () => overrides.experiment ?? null) },
    experimentAssignment: { groupBy: jest.fn(async () => overrides.samples ?? []) },
    $queryRawUnsafe: jest.fn(async () => overrides.counts ?? []),
  };
}

describe('ExperimentMetricsService', () => {
  it('aggregates observed metrics and computes rates', async () => {
    const prisma = makePrisma({
      experiment: EXPERIMENT,
      samples: [
        { variantId: 'v-control', _count: { _all: 10 } },
        { variantId: 'v-treatment', _count: { _all: 8 } },
      ],
      counts: [
        { variant_id: 'v-control', type: 'RECOMMENDATION_IMPRESSION', count: 10n },
        { variant_id: 'v-control', type: 'RECOMMENDATION_CLICK', count: 2n },
        { variant_id: 'v-control', type: 'PRODUCT_FAVORITE', count: 1n },
        { variant_id: 'v-control', type: 'WHATSAPP_CLICK', count: 3n },
        { variant_id: 'v-treatment', type: 'RECOMMENDATION_IMPRESSION', count: 5n },
      ],
    });
    const service = new ExperimentMetricsService(prisma as never);

    const result = await service.getResults('exp-1', { period: '30d' });

    const control = result.variants.find((v) => v.key === 'CONTROL')!;
    expect(control.sampleSize).toBe(10);
    expect(control.impressions).toBe(10);
    expect(control.clicks).toBe(2);
    expect(control.ctr).toBe(20);
    expect(control.favorites).toBe(1);
    expect(control.favoriteRate).toBe(10);
    expect(control.contacts).toBe(3);
    expect(control.contactRate).toBe(30);

    const treatment = result.variants.find((v) => v.key === 'TREATMENT')!;
    expect(treatment.impressions).toBe(5);
    expect(treatment.clicks).toBe(0);
    expect(treatment.ctr).toBe(0);

    expect(result.significance.computed).toBe(false);
  });

  it('returns null rates when the denominator is zero', async () => {
    const prisma = makePrisma({
      experiment: {
        ...EXPERIMENT,
        variants: [{ id: 'v-control', key: 'CONTROL', name: 'Control', allocation: 100 }],
      },
      samples: [],
      counts: [],
    });
    const service = new ExperimentMetricsService(prisma as never);

    const result = await service.getResults('exp-1', { period: '30d' });

    expect(result.variants[0].impressions).toBe(0);
    expect(result.variants[0].ctr).toBeNull();
    expect(result.variants[0].favoriteRate).toBeNull();
    expect(result.variants[0].contactRate).toBeNull();
  });

  it('never exposes user identifiers in the response', async () => {
    const prisma = makePrisma({ experiment: EXPERIMENT });
    const service = new ExperimentMetricsService(prisma as never);

    const result = await service.getResults('exp-1', { period: '30d' });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/userId/);
    expect(serialized).not.toMatch(/subjectId/);
  });

  it('throws when the experiment does not exist', async () => {
    const service = new ExperimentMetricsService(makePrisma({ experiment: null }) as never);
    await expect(service.getResults('missing', { period: '30d' })).rejects.toThrow(/not found/i);
  });

  it('rejects an invalid custom period', async () => {
    const service = new ExperimentMetricsService(makePrisma({ experiment: EXPERIMENT }) as never);
    await expect(
      service.getResults('exp-1', { period: 'custom', startDate: '2026-01-02', endDate: '2026-01-01' }),
    ).rejects.toThrow(/Invalid query parameters|startDate/);
  });
});
