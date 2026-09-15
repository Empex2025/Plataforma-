export type CandidateSource = 'deterministic' | 'semantic' | 'behavioral';

export type CandidateSets = Partial<Record<CandidateSource, string[]>>;

const SOURCE_PRIORITY: CandidateSource[] = ['deterministic', 'semantic', 'behavioral'];

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
