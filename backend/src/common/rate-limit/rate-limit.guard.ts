import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  RATE_LIMIT_CONFIG,
  RATE_LIMIT_KEY,
  RATE_LIMIT_MAX_KEYS,
  type RateLimitConfig,
  type RateLimitOptions,
} from './rate-limit.constants.js';

interface Hit {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, Hit>();

  constructor(
    private readonly reflector: Reflector,
    @Inject(RATE_LIMIT_CONFIG) private readonly config: RateLimitConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.config.enabled) return true;

    const routeOptions = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const options: RateLimitOptions = routeOptions ?? {
      limit: this.config.limit,
      ttlMs: this.config.ttlMs,
    };

    const request = context.switchToHttp().getRequest<{ ip?: string; user?: { sub?: string } }>();
    const subject = request.user?.sub ?? request.ip ?? 'unknown';
    const handler = `${context.getClass().name}.${context.getHandler().name}`;
    const key = `${handler}:${subject}`;

    const now = Date.now();
    this.pruneIfNeeded(now);

    const hit = this.hits.get(key);
    if (!hit || hit.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + options.ttlMs });
      return true;
    }

    if (hit.count >= options.limit) {
      throw new HttpException(
        { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: 'Muitas requisições' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    hit.count += 1;
    return true;
  }

  private pruneIfNeeded(now: number): void {
    if (this.hits.size < RATE_LIMIT_MAX_KEYS) return;
    for (const [key, hit] of this.hits) {
      if (hit.resetAt <= now) this.hits.delete(key);
    }
  }
}
