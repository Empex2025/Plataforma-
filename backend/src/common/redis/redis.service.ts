import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

export interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
}

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly memory = new Map<string, MemoryEntry>();

  constructor(options: RedisConnectionOptions) {
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
      this.logger.warn(`Redis unavailable, using in-memory fallback: ${error.message}`);
    });
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    const client = await this.getClient();
    if (client) {
      await client.set(key, value, 'PX', ttlMs);
      return;
    }
    this.setMemory(key, value, ttlMs);
  }

  async get(key: string): Promise<string | null> {
    const client = await this.getClient();
    if (client) return client.get(key);

    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return entry.value;
  }

  async del(key: string): Promise<void> {
    const client = await this.getClient();
    if (client) {
      await client.del(key);
      return;
    }
    this.memory.delete(key);
  }

  async increment(key: string, ttlMs: number): Promise<number> {
    const client = await this.getClient();
    if (client) {
      const count = await client.incr(key);
      if (count === 1) await client.pexpire(key, ttlMs);
      return count;
    }

    const entry = this.memory.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      this.setMemory(key, '1', ttlMs);
      return 1;
    }
    const next = Number(entry.value) + 1;
    entry.value = String(next);
    return next;
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

  private async getClient(): Promise<Redis | null> {
    try {
      if (this.client.status === 'wait') await this.client.connect();
      return this.client.status === 'ready' || this.client.status === 'connect'
        ? this.client
        : null;
    } catch (error) {
      this.logger.warn(
        `Redis connection failed, using in-memory fallback: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private setMemory(key: string, value: string, ttlMs: number): void {
    this.memory.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}
