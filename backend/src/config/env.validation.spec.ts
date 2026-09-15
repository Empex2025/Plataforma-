import { validateEnv } from './env.validation.js';

const validConfig = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/local_commerce',
  JWT_SECRET: 'a-very-secure-secret-key',
};

describe('validateEnv', () => {
  it('returns the config when all required variables are present', () => {
    expect(validateEnv({ ...validConfig })).toEqual(validConfig);
  });

  it('accepts optional variables with defaults', () => {
    const result = validateEnv({
      ...validConfig,
      PORT: '3000',
      VALKEY_PORT: '6379',
      MEILISEARCH_HOST: 'http://localhost:7700',
    });
    expect(result.PORT).toBe('3000');
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => validateEnv({ JWT_SECRET: 'a-very-secure-secret-key' })).toThrow(
      /DATABASE_URL is required/,
    );
  });

  it('throws when JWT_SECRET is missing', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: 'postgresql://localhost:5432/db' }),
    ).toThrow(/JWT_SECRET is required/);
  });

  it('throws when JWT_SECRET is too short', () => {
    expect(() =>
      validateEnv({ ...validConfig, JWT_SECRET: 'short' }),
    ).toThrow(/JWT_SECRET must be at least 16 characters/);
  });

  it('throws when PORT is invalid', () => {
    expect(() => validateEnv({ ...validConfig, PORT: 'not-a-port' })).toThrow(
      /PORT must be an integer/,
    );
  });

  it('throws when VALKEY_PORT is out of range', () => {
    expect(() => validateEnv({ ...validConfig, VALKEY_PORT: '70000' })).toThrow(
      /VALKEY_PORT must be an integer/,
    );
  });

  it('throws when S3 is partially configured', () => {
    expect(() =>
      validateEnv({ ...validConfig, S3_ENDPOINT: 'http://localhost:9000' }),
    ).toThrow(/S3_ACCESS_KEY is required when S3 storage is configured/);
  });

  it('accepts a complete S3 configuration', () => {
    const result = validateEnv({
      ...validConfig,
      S3_ENDPOINT: 'http://localhost:9000',
      S3_ACCESS_KEY: 'minioadmin',
      S3_SECRET_KEY: 'minioadmin',
    });
    expect(result.S3_ENDPOINT).toBe('http://localhost:9000');
  });

  it('aggregates multiple errors in a single message', () => {
    expect(() => validateEnv({ PORT: 'bad', VALKEY_PORT: 'bad' })).toThrow(
      /DATABASE_URL is required[\s\S]*JWT_SECRET is required[\s\S]*PORT must be an integer[\s\S]*VALKEY_PORT must be an integer/,
    );
  });

  describe('AI configuration', () => {
    it('does not require AI variables when AI is disabled', () => {
      expect(validateEnv({ ...validConfig })).toEqual(validConfig);
    });

    it('throws when AI is enabled without a provider', () => {
      expect(() => validateEnv({ ...validConfig, AI_ENABLED: 'true' })).toThrow(
        /AI_PROVIDER is required when AI_ENABLED is true/,
      );
    });

    it('throws when AI is enabled with an invalid embedding dimension', () => {
      expect(() =>
        validateEnv({
          ...validConfig,
          AI_ENABLED: 'true',
          AI_PROVIDER: 'local',
          EMBEDDING_MODEL: 'local-deterministic',
          EMBEDDING_DIMENSION: 'not-a-number',
        }),
      ).toThrow(/EMBEDDING_DIMENSION must be a positive integer/);
    });

    it('throws when openai provider is missing base url or api key', () => {
      expect(() =>
        validateEnv({
          ...validConfig,
          AI_ENABLED: 'true',
          AI_PROVIDER: 'openai',
          EMBEDDING_MODEL: 'text-embedding-3-small',
          EMBEDDING_DIMENSION: '1536',
        }),
      ).toThrow(/AI_BASE_URL is required when AI_PROVIDER is openai/);
    });

    it('accepts a complete AI configuration', () => {
      const result = validateEnv({
        ...validConfig,
        AI_ENABLED: 'true',
        AI_PROVIDER: 'local',
        EMBEDDING_MODEL: 'local-deterministic',
        EMBEDDING_DIMENSION: '64',
        EMBEDDING_VECTOR_STORE: 'array',
      });
      expect(result.EMBEDDING_DIMENSION).toBe('64');
    });
  });

  describe('statistics configuration', () => {
    it('accepts valid statistics variables', () => {
      const result = validateEnv({
        ...validConfig,
        STATISTICS_MIN_SAMPLE_SIZE: '250',
        STATISTICS_CONFIDENCE_LEVEL: '0.9',
        STATISTICS_ALPHA: '0.01',
      });
      expect(result.STATISTICS_MIN_SAMPLE_SIZE).toBe('250');
    });

    it('rejects an invalid minimum sample size', () => {
      expect(() =>
        validateEnv({ ...validConfig, STATISTICS_MIN_SAMPLE_SIZE: '0' }),
      ).toThrow(/STATISTICS_MIN_SAMPLE_SIZE must be a positive integer/);
    });

    it('rejects an out-of-range confidence level', () => {
      expect(() =>
        validateEnv({ ...validConfig, STATISTICS_CONFIDENCE_LEVEL: '1' }),
      ).toThrow(/STATISTICS_CONFIDENCE_LEVEL must be a number between 0 and 1/);
    });

    it('rejects an out-of-range alpha', () => {
      expect(() => validateEnv({ ...validConfig, STATISTICS_ALPHA: '0' })).toThrow(
        /STATISTICS_ALPHA must be a number between 0 and 1/,
      );
    });
  });

  describe('rate limiting and CORS configuration', () => {
    it('accepts valid rate limit variables', () => {
      const result = validateEnv({
        ...validConfig,
        RATE_LIMIT_TTL_MS: '30000',
        RATE_LIMIT_LIMIT: '50',
        CORS_ORIGINS: 'https://app.example.com',
      });
      expect(result.RATE_LIMIT_LIMIT).toBe('50');
    });

    it('rejects a non-positive rate limit window', () => {
      expect(() => validateEnv({ ...validConfig, RATE_LIMIT_TTL_MS: '0' })).toThrow(
        /RATE_LIMIT_TTL_MS must be a positive integer/,
      );
    });

    it('rejects a non-numeric rate limit', () => {
      expect(() => validateEnv({ ...validConfig, RATE_LIMIT_LIMIT: 'abc' })).toThrow(
        /RATE_LIMIT_LIMIT must be a positive integer/,
      );
    });

    it('requires CORS_ORIGINS in production', () => {
      expect(() => validateEnv({ ...validConfig, NODE_ENV: 'production' })).toThrow(
        /CORS_ORIGINS is required in production/,
      );
    });

    it('accepts production with an explicit CORS allowlist', () => {
      const result = validateEnv({
        ...validConfig,
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://app.example.com',
      });
      expect(result.CORS_ORIGINS).toBe('https://app.example.com');
    });
  });
});
