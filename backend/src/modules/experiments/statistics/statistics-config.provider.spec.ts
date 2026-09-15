import { buildExperimentStatisticsConfig } from './statistics-config.provider.js';

function makeConfig(map: Record<string, string | undefined>) {
  return { get: (key: string) => map[key] } as never;
}

describe('buildExperimentStatisticsConfig', () => {
  it('returns defaults when nothing is configured', () => {
    const config = buildExperimentStatisticsConfig(makeConfig({}));
    expect(config).toEqual({ minSampleSize: 100, confidenceLevel: 0.95, alpha: 0.05 });
  });

  it('reads configured values', () => {
    const config = buildExperimentStatisticsConfig(
      makeConfig({
        STATISTICS_MIN_SAMPLE_SIZE: '250',
        STATISTICS_CONFIDENCE_LEVEL: '0.9',
        STATISTICS_ALPHA: '0.01',
      }),
    );
    expect(config).toEqual({ minSampleSize: 250, confidenceLevel: 0.9, alpha: 0.01 });
  });

  it('falls back to defaults for invalid values', () => {
    const config = buildExperimentStatisticsConfig(
      makeConfig({
        STATISTICS_MIN_SAMPLE_SIZE: '-5',
        STATISTICS_CONFIDENCE_LEVEL: '2',
        STATISTICS_ALPHA: '0',
      }),
    );
    expect(config).toEqual({ minSampleSize: 100, confidenceLevel: 0.95, alpha: 0.05 });
  });
});
