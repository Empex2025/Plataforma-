import { AsyncLocalStorage } from 'node:async_hooks';

export interface ResolvedMembership {
  userId: string;
  companyId: string;
  role?: string;
  [key: string]: unknown;
}

export interface RequestContextStore {
  membershipCache: Map<string, ResolvedMembership>;
}

const storage = new AsyncLocalStorage<RequestContextStore>();

export function membershipCacheKey(companyId: string, userId: string): string {
  return `${companyId}:${userId}`;
}

export function runWithRequestContext<T>(
  store: RequestContextStore,
  callback: () => T,
): T {
  return storage.run(store, callback);
}

export function getRequestContext(): RequestContextStore | undefined {
  return storage.getStore();
}

export function cacheResolvedMembership(membership: ResolvedMembership): void {
  const context = storage.getStore();
  if (!context) return;

  context.membershipCache.set(
    membershipCacheKey(membership.companyId, membership.userId),
    membership,
  );
}

export function getCachedMembership(
  companyId: string,
  userId: string,
): ResolvedMembership | undefined {
  return storage.getStore()?.membershipCache.get(
    membershipCacheKey(companyId, userId),
  );
}
