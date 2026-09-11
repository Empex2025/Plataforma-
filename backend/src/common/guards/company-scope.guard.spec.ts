import { jest } from '@jest/globals';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CompanyScopeGuard } from './company-scope.guard.js';

describe('CompanyScopeGuard', () => {
  let guard: CompanyScopeGuard;
  let reflector: Reflector;
  let prisma: { userCompany: { findUnique: jest.Mock } };

  beforeEach(() => {
    reflector = new Reflector();
    prisma = { userCompany: { findUnique: jest.fn() } };
    guard = new CompanyScopeGuard(reflector, prisma as never);
  });

  function createMockContext(user: unknown, headers: Record<string, string> = {}, params: Record<string, string> = {}) {
    const request = { user, headers, params, userCompany: null };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  it('should allow access when company scope is not required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    expect(guard.canActivate(createMockContext(null))).resolves.toBe(true);
  });

  it('should throw ForbiddenException when user is not authenticated', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    await expect(
      guard.canActivate(createMockContext(null, { 'x-company-id': 'c1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when no company ID is provided', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    await expect(
      guard.canActivate(createMockContext({ sub: 'u1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user does not belong to company', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    prisma.userCompany.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(createMockContext({ sub: 'u1' }, { 'x-company-id': 'c1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should allow access when user belongs to company', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    prisma.userCompany.findUnique.mockResolvedValue({
      userId: 'u1',
      companyId: 'c1',
      role: 'MERCHANT_OWNER',
    });

    const ctx = createMockContext({ sub: 'u1' }, { 'x-company-id': 'c1' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });
});
