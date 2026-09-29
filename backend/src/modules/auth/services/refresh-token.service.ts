import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { RedisService } from '@/common/redis/redis.service.js';
import {
  DEFAULT_REFRESH_EXPIRATION,
  DEFAULT_REFRESH_TTL_MS,
} from '../auth.constants.js';

interface RefreshTokenPayload {
  sub: string;
  email: string;
  jti: string;
  type: 'refresh';
}

export interface RotatedRefreshToken {
  userId: string;
  email: string;
  refreshToken: string;
}

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async issue(userId: string, email: string): Promise<string> {
    const jti = randomUUID();
    const token = await this.jwtService.signAsync(
      { sub: userId, email, jti, type: 'refresh' },
      {
        secret: this.secret(),
        expiresIn: this.expiration() as never,
      },
    );

    await this.redis.set(this.key(jti), userId, this.ttlMs());
    return token;
  }

  async rotate(token: string): Promise<RotatedRefreshToken> {
    const payload = await this.verify(token);

    const storedUserId = await this.redis.get(this.key(payload.jti));
    if (!storedUserId || storedUserId !== payload.sub) {
      throw new UnauthorizedException('Sessão expirada');
    }

    await this.redis.del(this.key(payload.jti));

    const refreshToken = await this.issue(payload.sub, payload.email);
    return { userId: payload.sub, email: payload.email, refreshToken };
  }

  async revoke(token: string): Promise<void> {
    try {
      const payload = await this.verify(token);
      await this.redis.del(this.key(payload.jti));
    } catch {
      return;
    }
  }

  private async verify(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        token,
        { secret: this.secret() },
      );
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Refresh token inválido');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  private secret(): string {
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (refreshSecret) return refreshSecret;

    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    return secret;
  }

  private expiration(): string {
    return this.config.get<string>(
      'JWT_REFRESH_EXPIRATION',
      DEFAULT_REFRESH_EXPIRATION,
    );
  }

  private ttlMs(): number {
    const raw = this.config.get<string>('JWT_REFRESH_TTL_MS');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DEFAULT_REFRESH_TTL_MS;
  }

  private key(jti: string): string {
    return `auth:refresh:${jti}`;
  }
}
