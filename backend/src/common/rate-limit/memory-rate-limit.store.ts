import { Injectable } from '@nestjs/common';
import { RATE_LIMIT_MAX_KEYS } from './rate-limit.constants.js';
import type { RateLimitIncrement, RateLimitStore } from './rate-limit.store.js';

interface Hit {
  count: number;
  resetAt: number;
}

@Injectable()
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly hits = new Map<string, Hit>();

  async increment(key: string, ttlMs: number): Promise<RateLimitIncrement> {
    const now = Date.now();
    this.pruneIfNeeded(now);

    const hit = this.hits.get(key);
    if (!hit || hit.resetAt <= now) {
      const created: Hit = { count: 1, resetAt: now + ttlMs };
      this.hits.set(key, created);
      return { count: created.count, resetAt: created.resetAt };
    }

    hit.count += 1;
    return { count: hit.count, resetAt: hit.resetAt };
  }

  private pruneIfNeeded(now: number): void {
    if (this.hits.size < RATE_LIMIT_MAX_KEYS) return;
    for (const [key, hit] of this.hits) {
      if (hit.resetAt <= now) this.hits.delete(key);
    }
  }
}
