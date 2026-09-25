import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { MemoryRateLimitStore } from './memory-rate-limit.store.js';
import type { RateLimitIncrement, RateLimitStore } from './rate-limit.store.js';

const INCREMENT_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {current, ttl}
`;

export interface RedisRateLimitOptions {
  host: string;
  port: number;
  password?: string;
}

@Injectable()
export class RedisRateLimitStore implements RateLimitStore, OnModuleDestroy {
  private readonly logger = new Logger(RedisRateLimitStore.name);
  private readonly client: Redis;
  private readonly fallback = new MemoryRateLimitStore();

  constructor(options: RedisRateLimitOptions) {
    this.client = new Redis({
      host: options.host,
      port: options.port,
      ...(options.password ? { password: options.password } : {}),
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    });

    this.client.on('error', (error: Error) => {
      this.logger.warn(`Rate limit store unavailable, falling back to memory: ${error.message}`);
    });
  }

  async increment(key: string, ttlMs: number): Promise<RateLimitIncrement> {
    try {
      if (this.client.status === 'wait') {
        await this.client.connect();
      }

      const result = (await this.client.eval(
        INCREMENT_SCRIPT,
        1,
        key,
        String(ttlMs),
      )) as [number, number];

      const count = Number(result[0]);
      const ttl = Number(result[1]);

      return { count, resetAt: Date.now() + (ttl > 0 ? ttl : ttlMs) };
    } catch (error) {
      this.logger.warn(
        `Rate limit store error, falling back to memory: ${(error as Error).message}`,
      );
      return this.fallback.increment(key, ttlMs);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'wait' || this.client.status === 'end') {
      this.client.disconnect();
      return;
    }

    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
