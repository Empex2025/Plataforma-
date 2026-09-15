export type RecommendationStrategy = 'deterministic' | 'hybrid';

export interface ExperimentTargeting {
  /** Only authenticated subjects are eligible (v1 default). */
  authenticated?: boolean;
  /** Restrict to subjects that belong to one of these companies. */
  companyIds?: string[];
}

export interface VariantConfig {
  recommendation_mode?: RecommendationStrategy;
  [key: string]: unknown;
}

export type ExperimentSubjectType = 'user' | 'session';

export interface ExperimentSubject {
  type: ExperimentSubjectType;
  id: string;
}

export interface AssignmentResult {
  experimentId: string;
  experimentKey: string;
  variantId: string;
  variantKey: string;
  config: VariantConfig;
}

export interface ResolvedRecommendationStrategy {
  strategy: RecommendationStrategy;
  experimentKey: string;
  variantKey: string;
}
