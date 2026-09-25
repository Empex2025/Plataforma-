import { jest } from '@jest/globals';
import { HttpException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard.js';
import { MemoryRateLimitStore } from './memory-rate-limit.store.js';
import type { RateLimitConfig } from './rate-limit.constants.js';

function makeContext(
  ip = '1.2.3.4',
  methodName = 'handler',
  extra: { user?: { sub?: string }; headers?: Record<string, string> } = {},
): ExecutionContext {
  const handler = { [methodName]: () => undefined }[methodName];
  class TestController {}
  return {
    getHandler: () => handler,
    getClass: () => TestController,
    switchToHttp: () => ({ getRequest: () => ({ ip, ...extra }) }),
  } as unknown as ExecutionContext;
}

function makeReflector(metadata: unknown = undefined) {
  return { getAllAndOverride: jest.fn(() => metadata) };
}

function makeGuard(reflector: unknown, config: RateLimitConfig, jwtService?: unknown) {
  return new RateLimitGuard(reflector as never, config, new MemoryRateLimitStore(), jwtService as never);
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

  it('allows requests up to the limit and blocks the next one (429)', async () => {
    const guard = makeGuard(makeReflector(), ENABLED);
    const context = makeContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    await expect(guard.canActivate(context)).resolves.toBe(true);

    let error: unknown;
    try {
      await guard.canActivate(context);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
  });

  it('resets the window after ttl elapses', async () => {
    const guard = makeGuard(makeReflector(), ENABLED);
    const context = makeContext();

    await guard.canActivate(context);
    await guard.canActivate(context);
    await guard.canActivate(context);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(HttpException);

    now += ENABLED.ttlMs + 1;
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('isolates limits per client ip', async () => {
    const guard = makeGuard(makeReflector(), ENABLED);
    const contextA = makeContext('10.0.0.1');
    const contextB = makeContext('10.0.0.2');

    await guard.canActivate(contextA);
    await guard.canActivate(contextA);
    await guard.canActivate(contextA);

    await expect(guard.canActivate(contextB)).resolves.toBe(true);
  });

  it('uses the authenticated user id when already available on the request', async () => {
    const guard = makeGuard(makeReflector(), ENABLED);
    const contextA = makeContext('10.0.0.1', 'handler', { user: { sub: 'user-a' } });
    const contextB = makeContext('10.0.0.1', 'handler', { user: { sub: 'user-b' } });

    await guard.canActivate(contextA);
    await guard.canActivate(contextA);
    await guard.canActivate(contextA);

    await expect(guard.canActivate(contextB)).resolves.toBe(true);
  });

  it('derives the subject from a verified bearer token when the request user is not populated yet', async () => {
    const jwtService = { verify: jest.fn(() => ({ sub: 'user-token' })) };
    const guard = makeGuard(makeReflector(), ENABLED, jwtService);
    const context = makeContext('10.0.0.1', 'handler', { headers: { authorization: 'Bearer abc.def.ghi' } });

    await guard.canActivate(context);
    await guard.canActivate(context);
    await guard.canActivate(context);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(HttpException);
    expect(jwtService.verify).toHaveBeenCalledWith('abc.def.ghi');
  });

  it('falls back to ip when the bearer token is invalid', async () => {
    const jwtService = { verify: jest.fn(() => { throw new Error('invalid'); }) };
    const guard = makeGuard(makeReflector(), ENABLED, jwtService);
    const contextA = makeContext('10.0.0.1', 'handler', { headers: { authorization: 'Bearer bad' } });
    const contextB = makeContext('10.0.0.2', 'handler', { headers: { authorization: 'Bearer bad' } });

    await guard.canActivate(contextA);
    await guard.canActivate(contextA);
    await guard.canActivate(contextA);

    await expect(guard.canActivate(contextB)).resolves.toBe(true);
  });

  it('honors a stricter per-route override', async () => {
    const guard = makeGuard(makeReflector({ limit: 1, ttlMs: 1000 }), ENABLED);
    const context = makeContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(HttpException);
  });

  it('does nothing when disabled', async () => {
    const guard = makeGuard(makeReflector(), { enabled: false, limit: 1, ttlMs: 1000 });
    const context = makeContext();

    for (let i = 0; i < 10; i += 1) {
      await expect(guard.canActivate(context)).resolves.toBe(true);
    }
  });
});
