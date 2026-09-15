export type CandidateSource = 'deterministic' | 'semantic' | 'behavioral';

export type CandidateSets = Partial<Record<CandidateSource, string[]>>;

const SOURCE_PRIORITY: CandidateSource[] = ['deterministic', 'semantic', 'behavioral'];

/**
 * Merges the candidate sets from the available sources, preserving source
 * priority and removing duplicates, capped at `limit`.
 *
 * This is the "union + dedup" step of the hybrid pipeline. It never invents ids
 * and never queries the database: it only orders the already retrieved ids.
 */
export function mergeCandidates(sets: CandidateSets, limit: number): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const source of SOURCE_PRIORITY) {
    for (const id of sets[source] ?? []) {
      if (!id || seen.has(id)) continue;
      seen.add(id);
      merged.push(id);
      if (merged.length >= limit) return merged;
    }
  }

  return merged;
}
