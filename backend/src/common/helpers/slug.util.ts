import { ConflictException } from '@nestjs/common';

export interface SlugCandidate {
  id: string;
  slug: string;
}

export interface ResolveUniqueSlugOptions {
  providedSlug?: string;
  name: string;
  excludeId?: string;
  findExisting: (baseSlug: string) => Promise<SlugCandidate[]>;
  conflictMessage?: string;
  maxSuffix?: number;
}

export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildSlugLookupWhere(baseSlug: string): {
  OR: Array<{ slug: string } | { slug: { startsWith: string } }>;
} {
  return {
    OR: [{ slug: baseSlug }, { slug: { startsWith: `${baseSlug}-` } }],
  };
}

export async function resolveUniqueSlug(
  options: ResolveUniqueSlugOptions,
): Promise<string> {
  const {
    providedSlug,
    name,
    excludeId,
    findExisting,
    conflictMessage = 'Slug already in use',
    maxSuffix = 1000,
  } = options;

  const baseSlug = normalizeSlug(providedSlug ?? name);

  if (!baseSlug) {
    throw new ConflictException('Could not generate a valid slug');
  }

  const existing = await findExisting(baseSlug);

  const takenByOther = new Set(
    existing
      .filter((candidate) => !excludeId || candidate.id !== excludeId)
      .map((candidate) => candidate.slug),
  );

  if (!takenByOther.has(baseSlug)) {
    return baseSlug;
  }

  if (providedSlug) {
    throw new ConflictException(conflictMessage);
  }

  for (let i = 2; i <= maxSuffix; i++) {
    const candidate = `${baseSlug}-${i}`;
    if (!takenByOther.has(candidate)) {
      return candidate;
    }
  }

  throw new ConflictException('Could not generate a unique slug');
}
