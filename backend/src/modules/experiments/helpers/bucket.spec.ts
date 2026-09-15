import { BUCKET_COUNT } from '../experiments.constants.js';
import { selectVariantByAllocation, stableBucket } from './bucket.js';

describe('stableBucket', () => {
  it('is deterministic for the same seed', () => {
    expect(stableBucket('user:1:exp')).toBe(stableBucket('user:1:exp'));
  });

  it('stays within the bucket range', () => {
    for (let i = 0; i < 500; i += 1) {
      const bucket = stableBucket(`user:${i}:exp`);
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(BUCKET_COUNT);
    }
  });
});

describe('selectVariantByAllocation', () => {
  const variants = [
    { key: 'CONTROL', allocation: 50 },
    { key: 'TREATMENT', allocation: 50 },
  ];

  it('selects the first variant for the lowest bucket', () => {
    expect(selectVariantByAllocation(variants, 0)?.key).toBe('CONTROL');
  });

  it('selects the last variant for the highest bucket', () => {
    expect(selectVariantByAllocation(variants, BUCKET_COUNT - 1)?.key).toBe('TREATMENT');
  });

  it('honors a 90/10 split at the boundary', () => {
    const split = [
      { key: 'CONTROL', allocation: 90 },
      { key: 'TREATMENT', allocation: 10 },
    ];
    expect(selectVariantByAllocation(split, 8999)?.key).toBe('CONTROL');
    expect(selectVariantByAllocation(split, 9000)?.key).toBe('TREATMENT');
  });

  it('returns null when there are no variants', () => {
    expect(selectVariantByAllocation([], 10)).toBeNull();
  });

  it('approximates the allocation across many buckets', () => {
    let control = 0;
    for (let bucket = 0; bucket < BUCKET_COUNT; bucket += 1) {
      if (selectVariantByAllocation(variants, bucket)?.key === 'CONTROL') control += 1;
    }
    expect(control).toBe(BUCKET_COUNT / 2);
  });
});
