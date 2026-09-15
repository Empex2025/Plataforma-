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
