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
});
