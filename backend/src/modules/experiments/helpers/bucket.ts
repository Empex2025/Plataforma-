import { createHash } from 'node:crypto';
import { BUCKET_COUNT } from '../experiments.constants.js';

export function stableBucket(seed: string): number {
  const hash = createHash('sha256').update(seed).digest();
  return hash.readUInt32BE(0) % BUCKET_COUNT;
}

export interface AllocationVariant {
  allocation: number;
}

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
