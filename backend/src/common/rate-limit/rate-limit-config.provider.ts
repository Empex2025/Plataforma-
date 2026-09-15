import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_RATE_LIMIT_LIMIT,
  DEFAULT_RATE_LIMIT_TTL_MS,
  type RateLimitConfig,
} from './rate-limit.constants.js';

function readPositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function buildRateLimitConfig(config: ConfigService): RateLimitConfig {
  const requestedEnabled = String(config.get<string>('RATE_LIMIT_ENABLED', 'true')).toLowerCase() !== 'false';
  const enabled = requestedEnabled && process.env.NODE_ENV !== 'test';

  return {
    enabled,
    ttlMs: readPositiveInt(config.get<string>('RATE_LIMIT_TTL_MS'), DEFAULT_RATE_LIMIT_TTL_MS),
    limit: readPositiveInt(config.get<string>('RATE_LIMIT_LIMIT'), DEFAULT_RATE_LIMIT_LIMIT),
  };
}
