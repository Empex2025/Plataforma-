import { jest } from '@jest/globals';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CompanyScopeGuard } from './company-scope.guard.js';
import { COMPANY_SCOPE_KEY } from '../decorators/company-scope.decorator.js';
import { COMPANY_SCOPE_INACTIVE_KEY } from '../decorators/allow-inactive-company.decorator.js';

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

  function mockReflector(scopeRequired: boolean, allowInactive = false) {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
      if (key === COMPANY_SCOPE_KEY) return scopeRequired;
      if (key === COMPANY_SCOPE_INACTIVE_KEY) return allowInactive;
      return undefined;
    });
  }

  it('should allow access when company scope is not required', () => {
    mockReflector(false);
    expect(guard.canActivate(createMockContext(null))).resolves.toBe(true);
  });

  it('should throw ForbiddenException when user is not authenticated', async () => {
    mockReflector(true);
    await expect(
      guard.canActivate(createMockContext(null, { 'x-company-id': 'c1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when no company ID is provided', async () => {
    mockReflector(true);
    await expect(
      guard.canActivate(createMockContext({ sub: 'u1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user does not belong to company', async () => {
    mockReflector(true);
    prisma.userCompany.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(createMockContext({ sub: 'u1' }, { 'x-company-id': 'c1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should allow access when user belongs to active company', async () => {
    mockReflector(true);
    prisma.userCompany.findUnique.mockResolvedValue({
      userId: 'u1',
      companyId: 'c1',
      role: 'MERCHANT_OWNER',
      company: { id: 'c1', status: 'ACTIVE', deletedAt: null },
    });

    const ctx = createMockContext({ sub: 'u1' }, { 'x-company-id': 'c1' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when company is INACTIVE', async () => {
    mockReflector(true, false);
    prisma.userCompany.findUnique.mockResolvedValue({
      userId: 'u1',
      companyId: 'c1',
      role: 'MERCHANT_OWNER',
      company: { id: 'c1', status: 'INACTIVE', deletedAt: null },
    });

    await expect(
      guard.canActivate(createMockContext({ sub: 'u1' }, { 'x-company-id': 'c1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should allow access to INACTIVE company when AllowInactiveCompany is set', async () => {
    mockReflector(true, true);
    prisma.userCompany.findUnique.mockResolvedValue({
      userId: 'u1',
      companyId: 'c1',
      role: 'MERCHANT_OWNER',
      company: { id: 'c1', status: 'INACTIVE', deletedAt: null },
    });

    const ctx = createMockContext({ sub: 'u1' }, { 'x-company-id': 'c1' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should throw NotFoundException when company is deleted', async () => {
    mockReflector(true);
    prisma.userCompany.findUnique.mockResolvedValue({
      userId: 'u1',
      companyId: 'c1',
      role: 'MERCHANT_OWNER',
      company: { id: 'c1', status: 'ACTIVE', deletedAt: new Date() },
    });

    await expect(
      guard.canActivate(createMockContext({ sub: 'u1' }, { 'x-company-id': 'c1' })),
    ).rejects.toThrow('A empresa foi excluída');
  });

  it('should use params.companyId when x-company-id header is not present', async () => {
    mockReflector(true);
    prisma.userCompany.findUnique.mockResolvedValue({
      userId: 'u1',
      companyId: 'c1',
      role: 'MERCHANT_OWNER',
      company: { id: 'c1', status: 'ACTIVE', deletedAt: null },
    });

    const ctx = createMockContext({ sub: 'u1' }, {}, { companyId: 'c1' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });
});
