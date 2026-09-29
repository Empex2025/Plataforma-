import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'node:crypto';
import { RedisService } from '@/common/redis/redis.service.js';

export type VerificationChannel = 'email' | 'phone';

const DEFAULT_VERIFICATION_OTP_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class VerificationService {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async request(userId: string, channel: VerificationChannel): Promise<string> {
    const code = randomInt(100000, 1000000).toString();
    await this.redis.set(this.key(userId, channel), code, this.ttlMs());
    return code;
  }

  async consume(
    userId: string,
    channel: VerificationChannel,
    code: string,
  ): Promise<boolean> {
    const stored = await this.redis.get(this.key(userId, channel));
    if (!stored || stored !== code) return false;

    await this.redis.del(this.key(userId, channel));
    return true;
  }

  private ttlMs(): number {
    const raw = this.config.get<string>('VERIFICATION_OTP_TTL_MS');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isInteger(parsed) && parsed > 0
      ? parsed
      : DEFAULT_VERIFICATION_OTP_TTL_MS;
  }

  private key(userId: string, channel: VerificationChannel): string {
    return `auth:verification:${channel}:${userId}`;
  }
}
