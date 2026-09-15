import { BadRequestException } from '@nestjs/common';
import { ALLOCATION_TOTAL } from '../experiments.constants.js';

export interface AllocationVariantInput {
  key: string;
  allocation: number;
}

export function validateAllocation(variants: AllocationVariantInput[]): void {
  if (!Array.isArray(variants) || variants.length === 0) {
    throw new BadRequestException('At least one variant is required');
  }

  const keys = new Set<string>();
  let total = 0;

  for (const variant of variants) {
    if (!variant.key || variant.key.trim() === '') {
      throw new BadRequestException('Variant key is required');
    }
    if (keys.has(variant.key)) {
      throw new BadRequestException(`Duplicate variant key: ${variant.key}`);
    }
    keys.add(variant.key);

    if (
      !Number.isInteger(variant.allocation) ||
      variant.allocation < 0 ||
      variant.allocation > ALLOCATION_TOTAL
    ) {
      throw new BadRequestException(
        `Variant "${variant.key}" allocation must be an integer between 0 and ${ALLOCATION_TOTAL}`,
      );
    }

    total += variant.allocation;
  }

  if (total !== ALLOCATION_TOTAL) {
    throw new BadRequestException(
      `Variant allocations must sum to ${ALLOCATION_TOTAL} (got ${total})`,
    );
  }
}
