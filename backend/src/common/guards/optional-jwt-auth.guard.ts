import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

/**
 * OptionalJwtAuthGuard — Attempts JWT authentication but does NOT block unauthenticated requests.
 *
 * Behavior:
 *   - No Authorization header → request.user = null (anonymous)
 *   - Valid token → request.user = { sub, email, role, active }
 *   - Invalid token → throws UnauthorizedException
 *
 * Use this for endpoints that accept both authenticated and anonymous users
 * (e.g., event tracking).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  override handleRequest<TUser = unknown>(err: unknown, user: unknown): TUser {
    if (err) {
      throw err;
    }
    // If no user and no error, it means no token was provided — allow anonymous
    return (user ?? null) as TUser;
  }
}
