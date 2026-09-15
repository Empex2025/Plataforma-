/**
 * Hybrid-ranking weights (Fase 20).
 *
 * These are INITIAL weights, centralized here on purpose. They are intentionally
 * separate from the Fase 17 `RECOMMENDATION_WEIGHTS`, which stay untouched.
 *
 * When a component is unavailable (e.g. no query embedding, no history) its
 * weight is redistributed across the available components, so the deterministic
 * score always contributes and the endpoint never fails.
 */
export const AI_RECOMMENDATION_WEIGHTS = {
  deterministic: 0.5,
  semantic: 0.3,
  behavioral: 0.2,
} as const;

export const AI_RECOMMENDATION_THRESHOLDS = {
  semanticReason: 0.2,
} as const;

export const AI_CANDIDATE_LIMITS = {
  deterministic: 100,
  semantic: 100,
  behavioral: 100,
  merged: 150,
} as const;
