import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { resolveMembership } from './membership.js';
import {
  cacheResolvedMembership,
  runWithRequestContext,
  type ResolvedMembership,
} from '@/common/context/request-context.store.js';

describe('resolveMembership', () => {
  function makePrisma(result: unknown) {
    return {
      userCompany: { findUnique: jest.fn().mockResolvedValue(result) },
    } as never;
  }

  it('should query the database when there is no request context', async () => {
    const prisma = makePrisma({ userId: 'u1', companyId: 'c1', role: 'MERCHANT_OWNER' });

    const membership = await resolveMembership(prisma, 'c1', 'u1');

    expect(membership).toMatchObject({ userId: 'u1', companyId: 'c1' });
    expect(
      (prisma as unknown as { userCompany: { findUnique: jest.Mock } }).userCompany.findUnique,
    ).toHaveBeenCalledTimes(1);
  });

  it('should reuse the membership resolved by the guard (no extra query)', async () => {
    const prisma = makePrisma({ userId: 'u1', companyId: 'c1', role: 'MERCHANT_OWNER' });

    const membership = await runWithRequestContext(
      { membershipCache: new Map() },
      async () => {
        const cached: ResolvedMembership = {
          userId: 'u1',
          companyId: 'c1',
          role: 'MERCHANT_OWNER',
        };
        cacheResolvedMembership(cached);
        return resolveMembership(prisma, 'c1', 'u1');
      },
    );

    expect(membership.role).toBe('MERCHANT_OWNER');
    expect(
      (prisma as unknown as { userCompany: { findUnique: jest.Mock } }).userCompany.findUnique,
    ).not.toHaveBeenCalled();
  });

  it('should throw when the user is not a member', async () => {
    const prisma = makePrisma(null);

    await expect(resolveMembership(prisma, 'c1', 'u1')).rejects.toThrow(ForbiddenException);
  });

  it('should not reuse a cached membership for a different company', async () => {
    const prisma = makePrisma({ userId: 'u1', companyId: 'c2', role: 'MERCHANT_OWNER' });

    await runWithRequestContext({ membershipCache: new Map() }, async () => {
      cacheResolvedMembership({ userId: 'u1', companyId: 'c1' });
      await resolveMembership(prisma, 'c2', 'u1');
    });

    expect(
      (prisma as unknown as { userCompany: { findUnique: jest.Mock } }).userCompany.findUnique,
    ).toHaveBeenCalledTimes(1);
  });
});
