import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

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
    return (user ?? null) as TUser;
  }
}
