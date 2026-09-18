import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import {
  getCachedMembership,
  type ResolvedMembership,
} from '@/common/context/request-context.store.js';

export type { ResolvedMembership } from '@/common/context/request-context.store.js';

/**
 * Resolves the company membership for a user.
 *
 * When the request already passed through `CompanyScopeGuard`, the membership is
 * cached in the request context, so this returns it without hitting the database.
 * Outside a guarded request (e.g. queue processors) it falls back to a query.
 *
 * The database check remains the source of truth; the cache is per-request only.
 */
export async function resolveMembership(
  prisma: PrismaService,
  companyId: string,
  userId: string,
): Promise<ResolvedMembership> {
  const cached = getCachedMembership(companyId, userId);
  if (cached) return cached;

  const userCompany = await prisma.userCompany.findUnique({
    where: {
      userId_companyId: { userId, companyId },
    },
  });

  if (!userCompany) {
    throw new ForbiddenException('O usuário não pertence a esta empresa');
  }

  return userCompany as unknown as ResolvedMembership;
}
