export const EXPERIMENT_STATISTICS_CONFIG = 'EXPERIMENT_STATISTICS_CONFIG';

export interface ExperimentStatisticsConfig {
  /** Minimum metric sample size (impressions) required to assert significance. */
  minSampleSize: number;
  /** Two-sided confidence level, e.g. 0.95. Must be within (0, 1). */
  confidenceLevel: number;
  /** Significance level, e.g. 0.05. Must be within (0, 1). */
  alpha: number;
}

export const DEFAULT_MIN_SAMPLE_SIZE = 100;
export const DEFAULT_CONFIDENCE_LEVEL = 0.95;
export const DEFAULT_ALPHA = 0.05;

export const EXPERIMENT_METRICS = ['CTR', 'FAVORITE_RATE', 'CONTACT_RATE'] as const;
export type ExperimentMetric = (typeof EXPERIMENT_METRICS)[number];

export type StatisticalStatus = 'INSUFFICIENT_SAMPLE' | 'NOT_SIGNIFICANT' | 'SIGNIFICANT';

/**
 * Neutral wording. Deliberately no WINNER/BEST_VARIANT: statistical evidence is
 * presented, the product decision remains human.
 */
export const STATISTICAL_STATUS_LABELS: Record<StatisticalStatus, string> = {
  INSUFFICIENT_SAMPLE: 'Insufficient sample size to assess significance',
  NOT_SIGNIFICANT: 'No statistically significant difference at the configured level',
  SIGNIFICANT: 'Statistically significant difference at the configured level',
};
