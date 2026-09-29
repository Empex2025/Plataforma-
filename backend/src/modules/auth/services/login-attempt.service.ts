import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@/common/redis/redis.service.js';
import {
  DEFAULT_LOCKOUT_TTL_MS,
  DEFAULT_MAX_LOGIN_ATTEMPTS,
} from '../auth.constants.js';

@Injectable()
export class LoginAttemptService {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async isLocked(identifier: string): Promise<boolean> {
    return (await this.redis.get(this.lockKey(identifier))) !== null;
  }

  async registerFailure(identifier: string): Promise<void> {
    const attempts = await this.redis.increment(
      this.attemptsKey(identifier),
      this.lockTtlMs(),
    );

    if (attempts >= this.maxAttempts()) {
      await this.redis.set(this.lockKey(identifier), '1', this.lockTtlMs());
    }
  }

  async reset(identifier: string): Promise<void> {
    await this.redis.del(this.attemptsKey(identifier));
    await this.redis.del(this.lockKey(identifier));
  }

  private maxAttempts(): number {
    const raw = this.config.get<string>('AUTH_MAX_LOGIN_ATTEMPTS');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isInteger(parsed) && parsed > 0
      ? parsed
      : DEFAULT_MAX_LOGIN_ATTEMPTS;
  }

  private lockTtlMs(): number {
    const raw = this.config.get<string>('AUTH_LOCKOUT_TTL_MS');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isInteger(parsed) && parsed > 0
      ? parsed
      : DEFAULT_LOCKOUT_TTL_MS;
  }

  private attemptsKey(identifier: string): string {
    return `auth:login:attempts:${identifier}`;
  }

  private lockKey(identifier: string): string {
    return `auth:login:lock:${identifier}`;
  }
}
