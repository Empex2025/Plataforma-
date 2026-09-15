import { ApiProperty } from '@nestjs/swagger';
import {
  EXPERIMENT_METRICS,
  type ExperimentMetric,
  type StatisticalStatus,
} from '../statistics/statistics.constants.js';

export class ConfidenceIntervalDto {
  @ApiProperty({ description: 'Point estimate as a percentage (0..100)' })
  estimate!: number;

  @ApiProperty({ description: 'Lower bound as a percentage (0..100)' })
  lower!: number;

  @ApiProperty({ description: 'Upper bound as a percentage (0..100)' })
  upper!: number;
}

export class VariantMetricStatisticsDto {
  @ApiProperty({ enum: EXPERIMENT_METRICS })
  metric!: ExperimentMetric;

  @ApiProperty({ description: 'Metric sample size (impressions)' })
  sampleSize!: number;

  @ApiProperty({ description: 'Successes for the metric (clicks/favorites/contacts)' })
  successes!: number;

  @ApiProperty({ description: 'Rate as a percentage (0..100), or null when there is no sample', nullable: true })
  rate!: number | null;

  @ApiProperty({ type: ConfidenceIntervalDto, nullable: true })
  confidenceInterval!: ConfidenceIntervalDto | null;
}

export class VariantStatisticsDto {
  @ApiProperty()
  variantKey!: string;

  @ApiProperty({ type: [VariantMetricStatisticsDto] })
  metrics!: VariantMetricStatisticsDto[];
}

export class MetricComparisonDto {
  @ApiProperty({ enum: EXPERIMENT_METRICS })
  metric!: ExperimentMetric;

  @ApiProperty({ type: VariantMetricStatisticsDto })
  control!: VariantMetricStatisticsDto;

  @ApiProperty({ type: VariantMetricStatisticsDto })
  treatment!: VariantMetricStatisticsDto;

  @ApiProperty({
    description: 'treatment rate - control rate, in percentage points, or null',
    nullable: true,
  })
  absoluteDifference!: number | null;

  @ApiProperty({
    description: 'Relative lift as a fraction (0.2 = +20%), or null when control rate is zero',
    nullable: true,
  })
  relativeLift!: number | null;

  @ApiProperty({ description: 'Two-sided p-value in [0, 1], or null when not computable', nullable: true })
  pValue!: number | null;

  @ApiProperty({ description: 'True only when sample is sufficient and p-value < alpha' })
  significant!: boolean;

  @ApiProperty()
  confidenceLevel!: number;

  @ApiProperty({ enum: ['INSUFFICIENT_SAMPLE', 'NOT_SIGNIFICANT', 'SIGNIFICANT'] })
  status!: StatisticalStatus;
}

export class StatisticalAnalysisDto {
  @ApiProperty()
  confidenceLevel!: number;

  @ApiProperty()
  alpha!: number;

  @ApiProperty()
  minSampleSize!: number;

  @ApiProperty({ nullable: true })
  controlVariantKey!: string | null;

  @ApiProperty({ nullable: true })
  treatmentVariantKey!: string | null;

  @ApiProperty({ type: [VariantStatisticsDto], description: 'Per-variant estimates (supports N variants)' })
  variants!: VariantStatisticsDto[];

  @ApiProperty({
    type: [MetricComparisonDto],
    description: 'CONTROL vs TREATMENT pairwise comparisons. Empty when there are fewer than two variants.',
  })
  comparisons!: MetricComparisonDto[];
}
