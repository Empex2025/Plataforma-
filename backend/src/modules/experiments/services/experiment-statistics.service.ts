import { Inject, Injectable } from '@nestjs/common';
import {
  EXPERIMENT_STATISTICS_CONFIG,
  EXPERIMENT_METRICS,
  type ExperimentMetric,
  type ExperimentStatisticsConfig,
  type StatisticalStatus,
} from '../statistics/statistics.constants.js';
import { relativeLift, safeRatio } from '../statistics/proportion.helpers.js';
import { twoProportionZTest } from '../statistics/z-test.helpers.js';
import { wilsonInterval } from '../statistics/wilson.helpers.js';
import {
  MetricComparisonDto,
  StatisticalAnalysisDto,
  VariantMetricStatisticsDto,
  VariantStatisticsDto,
} from '../dto/experiment-statistics.dto.js';

export interface VariantCounts {
  variantKey: string;
  impressions: number;
  clicks: number;
  favorites: number;
  contacts: number;
}

interface VariantPair {
  control: VariantCounts | null;
  treatment: VariantCounts | null;
}

/**
 * Statistical analysis over the aggregated experiment metrics.
 *
 * It operates only on counts (no per-event access) and never returns individual
 * data. It presents evidence and uncertainty; it does NOT declare a winner.
 *
 * Rates/CI/absoluteDifference are returned as percentages (0..100) to match the
 * existing metric fields; relativeLift is a fraction (0.2 = +20%).
 */
@Injectable()
export class ExperimentStatisticsService {
  constructor(
    @Inject(EXPERIMENT_STATISTICS_CONFIG) private readonly config: ExperimentStatisticsConfig,
  ) {}

  get configuration(): ExperimentStatisticsConfig {
    return this.config;
  }

  buildAnalysis(variants: VariantCounts[]): StatisticalAnalysisDto {
    const pair = this.selectPair(variants);

    return {
      confidenceLevel: this.config.confidenceLevel,
      alpha: this.config.alpha,
      minSampleSize: this.config.minSampleSize,
      controlVariantKey: pair.control?.variantKey ?? null,
      treatmentVariantKey: pair.treatment?.variantKey ?? null,
      variants: variants.map((variant) => this.analyzeVariant(variant)),
      comparisons:
        pair.control && pair.treatment
          ? EXPERIMENT_METRICS.map((metric) => this.compareMetric(metric, pair.control!, pair.treatment!))
          : [],
    };
  }

  analyzeVariant(counts: VariantCounts): VariantStatisticsDto {
    return {
      variantKey: counts.variantKey,
      metrics: EXPERIMENT_METRICS.map((metric) =>
        this.buildVariantMetric(metric, this.successesFor(metric, counts), counts.impressions),
      ),
    };
  }

  compareMetric(
    metric: ExperimentMetric,
    control: VariantCounts,
    treatment: VariantCounts,
  ): MetricComparisonDto {
    const controlSuccesses = this.successesFor(metric, control);
    const treatmentSuccesses = this.successesFor(metric, treatment);

    const controlStats = this.buildVariantMetric(metric, controlSuccesses, control.impressions);
    const treatmentStats = this.buildVariantMetric(metric, treatmentSuccesses, treatment.impressions);

    const controlRate = safeRatio(controlSuccesses, control.impressions);
    const treatmentRate = safeRatio(treatmentSuccesses, treatment.impressions);

    const absoluteDifference =
      controlRate !== null && treatmentRate !== null
        ? round((treatmentRate - controlRate) * 100, 2)
        : null;

    const lift = relativeLift(controlRate, treatmentRate);

    const test = twoProportionZTest(
      controlSuccesses,
      control.impressions,
      treatmentSuccesses,
      treatment.impressions,
    );
    const pValue = test ? round(test.pValue, 4) : null;

    const insufficientSample =
      control.impressions < this.config.minSampleSize ||
      treatment.impressions < this.config.minSampleSize;

    const status = this.resolveStatus(insufficientSample, pValue);

    return {
      metric,
      control: controlStats,
      treatment: treatmentStats,
      absoluteDifference,
      relativeLift: lift !== null ? round(lift, 4) : null,
      pValue,
      significant: status === 'SIGNIFICANT',
      confidenceLevel: this.config.confidenceLevel,
      status,
    };
  }

  private resolveStatus(insufficientSample: boolean, pValue: number | null): StatisticalStatus {
    if (insufficientSample) return 'INSUFFICIENT_SAMPLE';
    if (pValue !== null && pValue < this.config.alpha) return 'SIGNIFICANT';
    return 'NOT_SIGNIFICANT';
  }

  private buildVariantMetric(
    metric: ExperimentMetric,
    successes: number,
    total: number,
  ): VariantMetricStatisticsDto {
    const interval = wilsonInterval(successes, total, this.config.confidenceLevel);

    return {
      metric,
      sampleSize: total,
      successes,
      rate: total > 0 ? round((successes / total) * 100, 2) : null,
      confidenceInterval: interval
        ? {
            estimate: round(interval.estimate * 100, 2),
            lower: round(interval.lower * 100, 2),
            upper: round(interval.upper * 100, 2),
          }
        : null,
    };
  }

  private successesFor(metric: ExperimentMetric, counts: VariantCounts): number {
    switch (metric) {
      case 'CTR':
        return counts.clicks;
      case 'FAVORITE_RATE':
        return counts.favorites;
      case 'CONTACT_RATE':
        return counts.contacts;
      default:
        return 0;
    }
  }

  private selectPair(variants: VariantCounts[]): VariantPair {
    if (variants.length < 2) return { control: null, treatment: null };

    const isControl = (key: string) => key.toUpperCase() === 'CONTROL';
    const isTreatment = (key: string) => key.toUpperCase() === 'TREATMENT';

    const control = variants.find((variant) => isControl(variant.variantKey)) ?? variants[0];
    const treatment =
      variants.find((variant) => isTreatment(variant.variantKey) && variant !== control) ??
      variants.find((variant) => variant !== control) ??
      null;

    return { control, treatment };
  }
}

function round(value: number, digits: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
