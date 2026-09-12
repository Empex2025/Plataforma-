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
}

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

  if (errors.length > 0) {
    const message = `Invalid environment configuration:\n- ${errors.join('\n- ')}`;
    Logger.error(message, 'EnvironmentValidation');
    throw new Error(message);
  }

  return config;
}
