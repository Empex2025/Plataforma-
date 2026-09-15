import { buildRateLimitConfig } from './rate-limit-config.provider.js';

function makeConfig(map: Record<string, string | undefined>) {
  return { get: (key: string) => map[key] } as never;
}

describe('buildRateLimitConfig', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('uses defaults when nothing is configured', () => {
    process.env.NODE_ENV = 'development';
    const config = buildRateLimitConfig(makeConfig({}));
    expect(config).toEqual({ enabled: true, ttlMs: 60000, limit: 100 });
  });

  it('reads configured values', () => {
    process.env.NODE_ENV = 'production';
    const config = buildRateLimitConfig(
      makeConfig({ RATE_LIMIT_TTL_MS: '30000', RATE_LIMIT_LIMIT: '50' }),
    );
    expect(config).toEqual({ enabled: true, ttlMs: 30000, limit: 50 });
  });

  it('is disabled when RATE_LIMIT_ENABLED=false', () => {
    process.env.NODE_ENV = 'production';
    expect(buildRateLimitConfig(makeConfig({ RATE_LIMIT_ENABLED: 'false' })).enabled).toBe(false);
  });

  it('is disabled during tests', () => {
    process.env.NODE_ENV = 'test';
    expect(buildRateLimitConfig(makeConfig({})).enabled).toBe(false);
  });

  it('falls back to defaults for invalid values', () => {
    process.env.NODE_ENV = 'development';
    const config = buildRateLimitConfig(makeConfig({ RATE_LIMIT_TTL_MS: '0', RATE_LIMIT_LIMIT: 'abc' }));
    expect(config.ttlMs).toBe(60000);
    expect(config.limit).toBe(100);
  });
});
