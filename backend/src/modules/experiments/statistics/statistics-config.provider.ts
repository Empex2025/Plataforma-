import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_ALPHA,
  DEFAULT_CONFIDENCE_LEVEL,
  DEFAULT_MIN_SAMPLE_SIZE,
  type ExperimentStatisticsConfig,
} from './statistics.constants.js';

function readPositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readProbability(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed < 1 ? parsed : fallback;
}

export function buildExperimentStatisticsConfig(config: ConfigService): ExperimentStatisticsConfig {
  return {
    minSampleSize: readPositiveInt(config.get<string>('STATISTICS_MIN_SAMPLE_SIZE'), DEFAULT_MIN_SAMPLE_SIZE),
    confidenceLevel: readProbability(config.get<string>('STATISTICS_CONFIDENCE_LEVEL'), DEFAULT_CONFIDENCE_LEVEL),
    alpha: readProbability(config.get<string>('STATISTICS_ALPHA'), DEFAULT_ALPHA),
  };
}
