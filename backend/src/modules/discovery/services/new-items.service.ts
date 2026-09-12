import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { DISCOVERY_THRESHOLDS } from '../discovery.constants.js';

@Injectable()
export class NewItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNewProductIds(companyId?: string): Promise<string[]> {
    const since = new Date();
    since.setDate(since.getDate() - DISCOVERY_THRESHOLDS.newItemsPeriodDays);

    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        createdAt: { gte: since },
        ...(companyId ? { companyId } : {}),
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return products.map((p) => p.id);
  }

  async getNewStoreIds(companyId?: string): Promise<string[]> {
    const since = new Date();
    since.setDate(since.getDate() - DISCOVERY_THRESHOLDS.newItemsPeriodDays);

    const stores = await this.prisma.store.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        createdAt: { gte: since },
        ...(companyId ? { companyId } : {}),
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return stores.map((s) => s.id);
  }
}
