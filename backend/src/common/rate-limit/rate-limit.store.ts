export const RATE_LIMIT_STORE = 'RATE_LIMIT_STORE';

export interface RateLimitIncrement {
  count: number;
  resetAt: number;
}

export interface RateLimitStore {
  increment(key: string, ttlMs: number): Promise<RateLimitIncrement>;
}
