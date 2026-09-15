import { jest } from '@jest/globals';
import { HttpException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard.js';
import type { RateLimitConfig } from './rate-limit.constants.js';

function makeContext(ip = '1.2.3.4', methodName = 'handler'): ExecutionContext {
  const handler = { [methodName]: () => undefined }[methodName];
  class TestController {}
  return {
    getHandler: () => handler,
    getClass: () => TestController,
    switchToHttp: () => ({ getRequest: () => ({ ip }) }),
  } as unknown as ExecutionContext;
}

function makeReflector(metadata: unknown = undefined) {
  return { getAllAndOverride: jest.fn(() => metadata) };
}

const ENABLED: RateLimitConfig = { enabled: true, limit: 3, ttlMs: 1000 };

describe('RateLimitGuard', () => {
  let now: number;

  beforeEach(() => {
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows requests up to the limit and blocks the next one (429)', () => {
    const guard = new RateLimitGuard(makeReflector() as never, ENABLED);
    const context = makeContext();

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);

    let error: unknown;
    try {
      guard.canActivate(context);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
  });

  it('resets the window after ttl elapses', () => {
    const guard = new RateLimitGuard(makeReflector() as never, ENABLED);
    const context = makeContext();

    guard.canActivate(context);
    guard.canActivate(context);
    guard.canActivate(context);
    expect(() => guard.canActivate(context)).toThrow(HttpException);

    now += ENABLED.ttlMs + 1;
    expect(guard.canActivate(context)).toBe(true);
  });

  it('isolates limits per client ip', () => {
    const guard = new RateLimitGuard(makeReflector() as never, ENABLED);
    const contextA = makeContext('10.0.0.1');
    const contextB = makeContext('10.0.0.2');

    guard.canActivate(contextA);
    guard.canActivate(contextA);
    guard.canActivate(contextA);

    expect(guard.canActivate(contextB)).toBe(true);
  });

  it('honors a stricter per-route override', () => {
    const guard = new RateLimitGuard(makeReflector({ limit: 1, ttlMs: 1000 }) as never, ENABLED);
    const context = makeContext();

    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);
  });

  it('does nothing when disabled', () => {
    const guard = new RateLimitGuard(makeReflector() as never, { enabled: false, limit: 1, ttlMs: 1000 });
    const context = makeContext();

    for (let i = 0; i < 10; i += 1) {
      expect(guard.canActivate(context)).toBe(true);
    }
  });
});
