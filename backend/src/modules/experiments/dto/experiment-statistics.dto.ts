import { ApiProperty } from '@nestjs/swagger';
import {
  EXPERIMENT_METRICS,
  type ExperimentMetric,
  type StatisticalStatus,
} from '../statistics/statistics.constants.js';

export class ConfidenceIntervalDto {
  @ApiProperty({ description: 'Estimativa pontual em percentual (0..100)' })
  estimate!: number;

  @ApiProperty({ description: 'Limite inferior em percentual (0..100)' })
  lower!: number;

  @ApiProperty({ description: 'Limite superior em percentual (0..100)' })
  upper!: number;
}

export class VariantMetricStatisticsDto {
  @ApiProperty({ enum: EXPERIMENT_METRICS })
  metric!: ExperimentMetric;

  @ApiProperty({ description: 'Tamanho da amostra da métrica (impressões)' })
  sampleSize!: number;

  @ApiProperty({ description: 'Sucessos da métrica (clicks/favorites/contacts)' })
  successes!: number;

  @ApiProperty({ description: 'Taxa em percentual (0..100), ou nulo quando não há amostra', nullable: true })
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
    description: 'taxa do tratamento - taxa do controle, em pontos percentuais, ou nulo',
    nullable: true,
  })
  absoluteDifference!: number | null;

  @ApiProperty({
    description: 'Elevação relativa como fração (0.2 = +20%), ou nulo quando a taxa do controle é zero',
    nullable: true,
  })
  relativeLift!: number | null;

  @ApiProperty({ description: 'p-valor bicaudal em [0, 1], ou nulo quando não computável', nullable: true })
  pValue!: number | null;

  @ApiProperty({ description: 'Verdadeiro apenas quando a amostra é suficiente e o p-valor < alpha' })
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

  @ApiProperty({ type: [VariantStatisticsDto], description: 'Estimativas por variante (suporta N variantes)' })
  variants!: VariantStatisticsDto[];

  @ApiProperty({
    type: [MetricComparisonDto],
    description: 'Comparações pareadas CONTROL vs TREATMENT. Vazio quando há menos de duas variantes.',
  })
  comparisons!: MetricComparisonDto[];
}
