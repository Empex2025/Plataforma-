import { BadRequestException } from '@nestjs/common';
import { ALLOCATION_TOTAL } from '../experiments.constants.js';

export interface AllocationVariantInput {
  key: string;
  allocation: number;
}

export function validateAllocation(variants: AllocationVariantInput[]): void {
  if (!Array.isArray(variants) || variants.length === 0) {
    throw new BadRequestException('Pelo menos uma variante é obrigatória');
  }

  const keys = new Set<string>();
  let total = 0;

  for (const variant of variants) {
    if (!variant.key || variant.key.trim() === '') {
      throw new BadRequestException('A chave da variante é obrigatória');
    }
    if (keys.has(variant.key)) {
      throw new BadRequestException(`Chave de variante duplicada: ${variant.key}`);
    }
    keys.add(variant.key);

    if (
      !Number.isInteger(variant.allocation) ||
      variant.allocation < 0 ||
      variant.allocation > ALLOCATION_TOTAL
    ) {
      throw new BadRequestException(
        `A alocação da variante "${variant.key}" deve ser um número inteiro entre 0 e ${ALLOCATION_TOTAL}`,
      );
    }

    total += variant.allocation;
  }

  if (total !== ALLOCATION_TOTAL) {
    throw new BadRequestException(
      `As alocações das variantes devem somar ${ALLOCATION_TOTAL} (obtido ${total})`,
    );
  }
}
