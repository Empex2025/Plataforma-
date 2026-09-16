import { Logger } from '@nestjs/common';

export interface EnvironmentVariables {
  NODE_ENV: string;
  PORT: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRATION: string;
  VALKEY_HOST: string;
  VALKEY_PORT: string;
  MEILISEARCH_HOST: string;
  MEILISEARCH_API_KEY?: string;
  S3_ENDPOINT?: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY?: string;
  S3_SECRET_KEY?: string;
  S3_REGION: string;
  AI_ENABLED?: string;
  AI_PROVIDER?: string;
  AI_BASE_URL?: string;
  AI_API_KEY?: string;
  EMBEDDING_MODEL?: string;
  EMBEDDING_DIMENSION?: string;
  EMBEDDING_VECTOR_STORE?: string;
  STATISTICS_MIN_SAMPLE_SIZE?: string;
  STATISTICS_CONFIDENCE_LEVEL?: string;
  STATISTICS_ALPHA?: string;
  RATE_LIMIT_ENABLED?: string;
  RATE_LIMIT_TTL_MS?: string;
  RATE_LIMIT_LIMIT?: string;
  CORS_ORIGINS?: string;
  SEARCH_TIMEOUT_MS?: string;
  DATABASE_POOL_MAX?: string;
  DATABASE_CONNECT_TIMEOUT_MS?: string;
  S3_CONNECT_TIMEOUT_MS?: string;
  S3_REQUEST_TIMEOUT_MS?: string;
  S3_MAX_ATTEMPTS?: string;
}

const INSECURE_JWT_SECRETS = ['change-me-in-production-min-16-chars'];

const REQUIRED_VARIABLES = ['DATABASE_URL', 'JWT_SECRET'] as const;
const S3_REQUIRED_TOGETHER = ['S3_ENDPOINT', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'] as const;
const MIN_JWT_SECRET_LENGTH = 16;

function isSet(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function isValidPort(value: string): boolean {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535;
}

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const errors: string[] = [];

  for (const key of REQUIRED_VARIABLES) {
    if (!isSet(config[key])) {
      errors.push(`${key} is required`);
    }
  }

  const jwtSecret = config.JWT_SECRET;
  if (isSet(jwtSecret) && String(jwtSecret).length < MIN_JWT_SECRET_LENGTH) {
    errors.push(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long`);
  }

  if (isSet(config.PORT) && !isValidPort(String(config.PORT))) {
    errors.push('PORT must be an integer between 1 and 65535');
  }

  if (isSet(config.VALKEY_PORT) && !isValidPort(String(config.VALKEY_PORT))) {
    errors.push('VALKEY_PORT must be an integer between 1 and 65535');
  }

  const hasAnyS3Config = S3_REQUIRED_TOGETHER.some((key) => isSet(config[key]));
  if (hasAnyS3Config) {
    for (const key of S3_REQUIRED_TOGETHER) {
      if (!isSet(config[key])) {
        errors.push(`${key} is required when S3 storage is configured`);
      }
    }
  }

  const aiEnabled = String(config.AI_ENABLED ?? 'false').toLowerCase() === 'true';
  if (aiEnabled) {
    if (!isSet(config.AI_PROVIDER)) {
      errors.push('AI_PROVIDER is required when AI_ENABLED is true');
    }
    if (!isSet(config.EMBEDDING_MODEL)) {
      errors.push('EMBEDDING_MODEL is required when AI_ENABLED is true');
    }
    const dimension = Number(config.EMBEDDING_DIMENSION);
    if (!Number.isInteger(dimension) || dimension <= 0) {
      errors.push('EMBEDDING_DIMENSION must be a positive integer when AI_ENABLED is true');
    }
    if (String(config.AI_PROVIDER) === 'openai') {
      if (!isSet(config.AI_BASE_URL)) {
        errors.push('AI_BASE_URL is required when AI_PROVIDER is openai');
      }
      if (!isSet(config.AI_API_KEY)) {
        errors.push('AI_API_KEY is required when AI_PROVIDER is openai');
      }
    }
  }

  if (isSet(config.STATISTICS_MIN_SAMPLE_SIZE)) {
    const minSample = Number(config.STATISTICS_MIN_SAMPLE_SIZE);
    if (!Number.isInteger(minSample) || minSample <= 0) {
      errors.push('STATISTICS_MIN_SAMPLE_SIZE must be a positive integer');
    }
  }
  for (const key of ['STATISTICS_CONFIDENCE_LEVEL', 'STATISTICS_ALPHA'] as const) {
    if (isSet(config[key])) {
      const value = Number(config[key]);
      if (!Number.isFinite(value) || value <= 0 || value >= 1) {
        errors.push(`${key} must be a number between 0 and 1 (exclusive)`);
      }
    }
  }

  for (const key of [
    'RATE_LIMIT_TTL_MS',
    'RATE_LIMIT_LIMIT',
    'SEARCH_TIMEOUT_MS',
    'DATABASE_POOL_MAX',
    'DATABASE_CONNECT_TIMEOUT_MS',
    'S3_CONNECT_TIMEOUT_MS',
    'S3_REQUEST_TIMEOUT_MS',
    'S3_MAX_ATTEMPTS',
  ] as const) {
    if (isSet(config[key])) {
      const value = Number(config[key]);
      if (!Number.isInteger(value) || value <= 0) {
        errors.push(`${key} must be a positive integer`);
      }
    }
  }

  if (String(config.NODE_ENV) === 'production') {
    if (!isSet(config.CORS_ORIGINS)) {
      errors.push('CORS_ORIGINS is required in production');
    }
    if (isSet(config.JWT_SECRET) && INSECURE_JWT_SECRETS.includes(String(config.JWT_SECRET))) {
      errors.push('JWT_SECRET must not use the example placeholder in production');
    }
  }

  if (errors.length > 0) {
    const message = `Invalid environment configuration:\n- ${errors.join('\n- ')}`;
    Logger.error(message, 'EnvironmentValidation');
    throw new Error(message);
  }

  return config;
}
