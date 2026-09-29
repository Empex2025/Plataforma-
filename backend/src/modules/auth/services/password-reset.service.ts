import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'node:crypto';
import { RedisService } from '@/common/redis/redis.service.js';
import { DEFAULT_PASSWORD_RESET_OTP_TTL_MS } from '../auth.constants.js';
import { MailerService } from './mailer.service.js';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly redis: RedisService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {}

  async request(email: string): Promise<void> {
    const otp = randomInt(100000, 1000000).toString();
    await this.redis.set(this.key(email), otp, this.ttlMs());
    await this.mailer.sendPasswordResetOtp(email, otp);
  }

  async consume(email: string, otp: string): Promise<boolean> {
    const stored = await this.redis.get(this.key(email));
    if (!stored || stored !== otp) return false;

    await this.redis.del(this.key(email));
    return true;
  }

  private ttlMs(): number {
    const raw = this.config.get<string>('PASSWORD_RESET_OTP_TTL_MS');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isInteger(parsed) && parsed > 0
      ? parsed
      : DEFAULT_PASSWORD_RESET_OTP_TTL_MS;
  }

  private key(email: string): string {
    return `auth:password-reset:${email}`;
  }
}
