export const RATE_LIMIT_KEY = 'rate_limit';
export const RATE_LIMIT_CONFIG = 'RATE_LIMIT_CONFIG';

export interface RateLimitOptions {
  limit: number;
  ttlMs: number;
}

export interface RateLimitConfig extends RateLimitOptions {
  enabled: boolean;
}

export const DEFAULT_RATE_LIMIT_TTL_MS = 60_000;
export const DEFAULT_RATE_LIMIT_LIMIT = 100;

export const STRICT_RATE_LIMITS = {
  auth: { limit: 10, ttlMs: 60_000 },
  writePublic: { limit: 30, ttlMs: 60_000 },
  search: { limit: 60, ttlMs: 60_000 },
  imports: { limit: 10, ttlMs: 60_000 },
} as const;

export const RATE_LIMIT_MAX_KEYS = 50_000;
