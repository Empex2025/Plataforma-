import { jest } from '@jest/globals';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  function createMockContext(metadata?: Record<string, unknown>) {
    const handler = jest.fn();
    const classRef = jest.fn();

    if (metadata) {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        (key: string) => metadata[key],
      );
    }

    return {
      switchToHttp: () => ({
        getRequest: () => ({ user: { sub: 'u1', email: 'a@b.com', role: 'CONSUMER', active: true } }),
      }),
      getHandler: () => handler,
      getClass: () => classRef,
    } as unknown as ExecutionContext;
  }

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true when route is marked @Public()', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const ctx = createMockContext({ isPublic: true });
      const result = guard.canActivate(ctx);

      expect(result).toBe(true);
    });

    it('should call super.canActivate when route is not public', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate').mockReturnValue(true);

      const ctx = createMockContext({ isPublic: false });
      const result = guard.canActivate(ctx);

      expect(result).toBe(true);
    });

    it('should call super.canActivate when isPublic metadata is undefined', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate').mockReturnValue(true);

      const ctx = createMockContext();
      const result = guard.canActivate(ctx);

      expect(result).toBe(true);
    });
  });

  describe('handleRequest', () => {
    it('should return user when valid', () => {
      const user = { sub: 'u1', email: 'a@b.com' };
      const result = guard.handleRequest(null, user);
      expect(result).toEqual(user);
    });

    it('should throw error when err is provided', () => {
      const error = new Error('jwt expired');
      expect(() => guard.handleRequest(error, null)).toThrow('jwt expired');
    });

    it('should throw UnauthorizedException when user is null and no error', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is undefined and no error', () => {
      expect(() => guard.handleRequest(null, undefined)).toThrow(UnauthorizedException);
    });
  });
});
