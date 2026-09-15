import { createHash } from 'node:crypto';
import { BUCKET_COUNT } from '../experiments.constants.js';

/**
 * Deterministic bucket in [0, BUCKET_COUNT) for a subject/experiment pair.
 *
 * Same seed => same bucket, so assignment is stable without any randomness.
 * `sha256` first 4 bytes are used as a uint32.
 */
export function stableBucket(seed: string): number {
  const hash = createHash('sha256').update(seed).digest();
  return hash.readUInt32BE(0) % BUCKET_COUNT;
}

export interface AllocationVariant {
  allocation: number;
}

/**
 * Selects a variant by cumulative allocation.
 *
 * Allocation is expressed in whole percentages (0..100) that sum to 100. Each
 * percentage maps to BUCKET_COUNT/100 buckets, so the boundaries are exact.
 */
export function selectVariantByAllocation<T extends AllocationVariant>(
  variants: T[],
  bucket: number,
): T | null {
  if (variants.length === 0) return null;

  const bucketsPerPercent = BUCKET_COUNT / 100;
  let cumulative = 0;

  for (const variant of variants) {
    cumulative += Math.round(variant.allocation * bucketsPerPercent);
    if (bucket < cumulative) return variant;
  }

  return variants[variants.length - 1] ?? null;
}
