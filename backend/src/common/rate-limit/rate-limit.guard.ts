import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  RATE_LIMIT_CONFIG,
  RATE_LIMIT_KEY,
  type RateLimitConfig,
  type RateLimitOptions,
} from './rate-limit.constants.js';
import { RATE_LIMIT_STORE, type RateLimitStore } from './rate-limit.store.js';

interface RateLimitedRequest {
  ip?: string;
  user?: { sub?: string };
  headers?: Record<string, string | string[] | undefined>;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(RATE_LIMIT_CONFIG) private readonly config: RateLimitConfig,
    @Inject(RATE_LIMIT_STORE) private readonly store: RateLimitStore,
    @Optional() private readonly jwtService?: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.config.enabled) return true;

    const routeOptions = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const options: RateLimitOptions = routeOptions ?? {
      limit: this.config.limit,
      ttlMs: this.config.ttlMs,
    };

    const request = context.switchToHttp().getRequest<RateLimitedRequest>();
    const subject = this.resolveSubject(request);
    const handler = `${context.getClass().name}.${context.getHandler().name}`;
    const key = `${handler}:${subject}`;

    const { count } = await this.store.increment(key, options.ttlMs);

    if (count > options.limit) {
      throw new HttpException(
        { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: 'Muitas requisições' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private resolveSubject(request: RateLimitedRequest): string {
    const authenticatedUserId = request.user?.sub;
    if (authenticatedUserId) {
      return `user:${authenticatedUserId}`;
    }

    const tokenUserId = this.resolveUserIdFromToken(request);
    if (tokenUserId) {
      return `user:${tokenUserId}`;
    }

    return `ip:${request.ip ?? 'unknown'}`;
  }

  private resolveUserIdFromToken(request: RateLimitedRequest): string | null {
    if (!this.jwtService) return null;

    const header = request.headers?.authorization;
    const value = Array.isArray(header) ? header[0] : header;
    if (!value || !value.startsWith('Bearer ')) return null;

    const token = value.slice('Bearer '.length).trim();
    if (!token) return null;

    try {
      const payload = this.jwtService.verify<{ sub?: string }>(token);
      return payload?.sub ?? null;
    } catch {
      return null;
    }
  }
}
