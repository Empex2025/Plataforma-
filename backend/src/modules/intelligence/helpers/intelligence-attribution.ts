import { PrismaService } from '@/db/prisma.service.js';

export interface ResolvedCompanyEntities {
  storeIds: string[];
  productIds: string[];
}

export async function resolveCompanyEntities(
  prisma: PrismaService,
  companyId: string,
): Promise<ResolvedCompanyEntities> {
  const [stores, products] = await Promise.all([
    prisma.store.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true },
    }),
    prisma.product.findMany({
      where: { companyId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    }),
  ]);

  return {
    storeIds: stores.map((s) => s.id),
    productIds: products.map((p) => p.id),
  };
}
