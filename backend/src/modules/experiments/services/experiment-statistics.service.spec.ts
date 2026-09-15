import { ExperimentStatisticsService, type VariantCounts } from './experiment-statistics.service.js';

const CONFIG = { minSampleSize: 100, confidenceLevel: 0.95, alpha: 0.05 };

function buildService() {
  return new ExperimentStatisticsService(CONFIG);
}

function control(overrides: Partial<VariantCounts> = {}): VariantCounts {
  return { variantKey: 'CONTROL', impressions: 1000, clicks: 100, favorites: 20, contacts: 10, ...overrides };
}

function treatment(overrides: Partial<VariantCounts> = {}): VariantCounts {
  return { variantKey: 'TREATMENT', impressions: 1000, clicks: 100, favorites: 20, contacts: 10, ...overrides };
}

describe('ExperimentStatisticsService', () => {
  it('builds a CONTROL vs TREATMENT analysis with one comparison per metric', () => {
    const analysis = buildService().buildAnalysis([control(), treatment()]);

    expect(analysis.controlVariantKey).toBe('CONTROL');
    expect(analysis.treatmentVariantKey).toBe('TREATMENT');
    expect(analysis.comparisons.map((c) => c.metric)).toEqual(['CTR', 'FAVORITE_RATE', 'CONTACT_RATE']);
    expect(analysis.variants).toHaveLength(2);
  });

  it('exposes rates as percentages (0..100)', () => {
    const analysis = buildService().buildAnalysis([control(), treatment()]);
    const controlVariant = analysis.variants.find((v) => v.variantKey === 'CONTROL')!;

    const ctr = controlVariant.metrics.find((m) => m.metric === 'CTR')!;
    expect(ctr.rate).toBe(10);
    expect(ctr.sampleSize).toBe(1000);
    expect(ctr.successes).toBe(100);
    expect(ctr.confidenceInterval).not.toBeNull();

    const favorite = controlVariant.metrics.find((m) => m.metric === 'FAVORITE_RATE')!;
    expect(favorite.rate).toBe(2);

    const contact = controlVariant.metrics.find((m) => m.metric === 'CONTACT_RATE')!;
    expect(contact.rate).toBe(1);
  });

  it('flags a large CTR difference as SIGNIFICANT', () => {
    const analysis = buildService().buildAnalysis([
      control({ clicks: 100 }),
      treatment({ clicks: 200 }),
    ]);
    const ctr = analysis.comparisons.find((c) => c.metric === 'CTR')!;

    expect(ctr.status).toBe('SIGNIFICANT');
    expect(ctr.significant).toBe(true);
    expect(ctr.pValue).not.toBeNull();
    expect(ctr.pValue!).toBeLessThan(CONFIG.alpha);
    expect(ctr.absoluteDifference).toBeCloseTo(10, 2);
    expect(ctr.relativeLift).toBeCloseTo(1, 2);
  });

  it('flags a small difference as NOT_SIGNIFICANT', () => {
    const analysis = buildService().buildAnalysis([
      control({ clicks: 100 }),
      treatment({ clicks: 105 }),
    ]);
    const ctr = analysis.comparisons.find((c) => c.metric === 'CTR')!;

    expect(ctr.status).toBe('NOT_SIGNIFICANT');
    expect(ctr.significant).toBe(false);
    expect(ctr.pValue!).toBeGreaterThanOrEqual(CONFIG.alpha);
  });

  it('reports INSUFFICIENT_SAMPLE and never significance below the threshold', () => {
    const analysis = buildService().buildAnalysis([
      control({ impressions: 50, clicks: 20 }),
      treatment({ impressions: 50, clicks: 30 }),
    ]);
    const ctr = analysis.comparisons.find((c) => c.metric === 'CTR')!;

    expect(ctr.status).toBe('INSUFFICIENT_SAMPLE');
    expect(ctr.significant).toBe(false);
  });

  it('returns nulls (no NaN/Infinity) when a denominator is zero', () => {
    const analysis = buildService().buildAnalysis([
      control({ impressions: 0, clicks: 0, favorites: 0, contacts: 0 }),
      treatment(),
    ]);
    const ctr = analysis.comparisons.find((c) => c.metric === 'CTR')!;

    expect(ctr.control.rate).toBeNull();
    expect(ctr.control.confidenceInterval).toBeNull();
    expect(ctr.absoluteDifference).toBeNull();
    expect(ctr.relativeLift).toBeNull();
    expect(ctr.pValue).toBeNull();
    expect(ctr.status).toBe('INSUFFICIENT_SAMPLE');
    expect(JSON.stringify(analysis)).not.toMatch(/NaN|Infinity/);
  });

  it('returns a null relative lift when the control rate is zero', () => {
    const analysis = buildService().buildAnalysis([
      control({ clicks: 0 }),
      treatment({ clicks: 50 }),
    ]);
    const ctr = analysis.comparisons.find((c) => c.metric === 'CTR')!;

    expect(ctr.relativeLift).toBeNull();
    expect(ctr.absoluteDifference).not.toBeNull();
  });

  it('skips the comparison when there is a single variant', () => {
    const analysis = buildService().buildAnalysis([control()]);
    expect(analysis.variants).toHaveLength(1);
    expect(analysis.comparisons).toEqual([]);
    expect(analysis.controlVariantKey).toBeNull();
    expect(analysis.treatmentVariantKey).toBeNull();
  });

  it('keeps individual stats for multi-variant experiments and compares CONTROL vs TREATMENT', () => {
    const analysis = buildService().buildAnalysis([
      control(),
      treatment(),
      { variantKey: 'VARIANT_C', impressions: 500, clicks: 50, favorites: 5, contacts: 5 },
    ]);

    expect(analysis.variants).toHaveLength(3);
    expect(analysis.controlVariantKey).toBe('CONTROL');
    expect(analysis.treatmentVariantKey).toBe('TREATMENT');
    expect(analysis.comparisons).toHaveLength(3);
  });

  it('never emits non-finite numbers', () => {
    const analysis = buildService().buildAnalysis([
      control({ impressions: 7, clicks: 3, favorites: 1, contacts: 0 }),
      treatment({ impressions: 11, clicks: 0, favorites: 0, contacts: 11 }),
    ]);

    const visit = (value: unknown): void => {
      if (typeof value === 'number') {
        expect(Number.isFinite(value)).toBe(true);
      } else if (Array.isArray(value)) {
        value.forEach(visit);
      } else if (value && typeof value === 'object') {
        Object.values(value).forEach(visit);
      }
    };
    visit(analysis);
  });
});
