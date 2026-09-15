import { AI_RECOMMENDATION_WEIGHTS } from '../ai-recommendation.constants.js';

export type HybridComponentKey = 'deterministic' | 'semantic' | 'behavioral';

export type HybridComponents = Partial<Record<HybridComponentKey, number>>;

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function combineHybridScore(
  components: HybridComponents,
  weights: Record<HybridComponentKey, number> = AI_RECOMMENDATION_WEIGHTS,
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const key of Object.keys(components) as HybridComponentKey[]) {
    const value = components[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;

    const weight = weights[key] ?? 0;
    weightedSum += clamp01(value) * weight;
    totalWeight += weight;
  }

  if (totalWeight <= 0) return 0;
  return weightedSum / totalWeight;
}
