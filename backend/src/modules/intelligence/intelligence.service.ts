import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service.js';
import { CompanyIntelligenceDto, TopEntityDto } from './dto/company-intelligence.dto.js';
import { PlatformIntelligenceDto, PlatformTotalsDto } from './dto/platform-intelligence.dto.js';

interface DemandGap {
  totalViews: number;
  totalContacts: number;
  conversionRate: number;
}

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== COMPANY INTELLIGENCE ====================

  /**
   * Company-scoped intelligence. Metrics are derived from Event rows by
   * resolving the company's stores and products — Event has no companyId.
   */
  async getCompanyIntelligence(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CompanyIntelligenceDto> {
    const storeIds = await this.getCompanyStoreIds(companyId);

    if (storeIds.length === 0) {
      return this.emptyCompanyIntelligence(companyId, startDate, endDate);
    }

    const productIds = await this.getCompanyProductIds(companyId);

    const [topProducts, topStores, demandGap] = await Promise.all([
      this.getTopProducts(productIds, startDate, endDate),
      this.getTopStores(storeIds, startDate, endDate),
      this.getDemandGap(productIds, startDate, endDate),
    ]);

    return {
      companyId,
      topProducts,
      topStores,
      demandGap,
      periodStart: startDate,
      periodEnd: endDate,
    };
  }

  private async getCompanyStoreIds(companyId: string): Promise<string[]> {
    const stores = await this.prisma.store.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true },
    });
    return stores.map((s) => s.id);
  }

  private async getCompanyProductIds(companyId: string): Promise<string[]> {
    const products = await this.prisma.product.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    return products.map((p) => p.id);
  }

  private async getTopProducts(
    productIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<TopEntityDto[]> {
    if (productIds.length === 0) return [];

    const events = await this.prisma.event.findMany({
      where: {
        targetType: 'product',
        targetId: { in: productIds },
        createdAt: { gte: startDate, lte: endDate },
        type: { in: ['PRODUCT_VIEW', 'WHATSAPP_CLICK', 'PHONE_CLICK'] },
      },
      select: { targetId: true, type: true },
    });

    return this.aggregateProductEvents(events);
  }

  private async getTopStores(
    storeIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<TopEntityDto[]> {
    if (storeIds.length === 0) return [];

    const events = await this.prisma.event.findMany({
      where: {
        targetType: 'store',
        targetId: { in: storeIds },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { targetId: true },
    });

    const counts = new Map<string, number>();
    for (const event of events) {
      if (!event.targetId) continue;
      counts.set(event.targetId, (counts.get(event.targetId) ?? 0) + 1);
    }

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const storeNames = await this.resolveStoreNames(sorted.map(([id]) => id));

    return sorted.map(([id, count]) => ({
      id,
      name: storeNames.get(id) ?? 'Unknown',
      count,
    }));
  }

  private async getTopSearches(
    startDate: Date,
    endDate: Date,
  ): Promise<TopEntityDto[]> {
    const events = await this.prisma.event.findMany({
      where: {
        type: 'SEARCH',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { metadata: true },
    });

    const searchCounts = new Map<string, number>();

    for (const event of events) {
      const metadata = event.metadata as Record<string, unknown> | null;
      if (metadata && typeof metadata === 'object' && typeof metadata['query'] === 'string') {
        const query = metadata['query'] as string;
        searchCounts.set(query, (searchCounts.get(query) ?? 0) + 1);
      }
    }

    return [...searchCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({
        id: query,
        name: query,
        count,
      }));
  }

  private async getDemandGap(
    productIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<DemandGap> {
    if (productIds.length === 0) {
      return { totalViews: 0, totalContacts: 0, conversionRate: 0 };
    }

    const [totalViews, totalContacts] = await Promise.all([
      this.prisma.event.count({
        where: {
          type: 'PRODUCT_VIEW',
          targetType: 'product',
          targetId: { in: productIds },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.event.count({
        where: {
          type: { in: ['WHATSAPP_CLICK', 'PHONE_CLICK'] },
          targetType: 'product',
          targetId: { in: productIds },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    return this.buildDemandGap(totalViews, totalContacts);
  }

  // ==================== PLATFORM INTELLIGENCE ====================

  /**
   * Platform-wide intelligence (admin only). Aggregates across all companies.
   */
  async getPlatformIntelligence(
    startDate: Date,
    endDate: Date,
  ): Promise<PlatformIntelligenceDto> {
    const [topProducts, topStores, topSearches, topCompanies, demandGap, totals] =
      await Promise.all([
        this.getPlatformTopProducts(startDate, endDate),
        this.getPlatformTopStores(startDate, endDate),
        this.getTopSearches(startDate, endDate),
        this.getPlatformTopCompanies(startDate, endDate),
        this.getPlatformDemandGap(startDate, endDate),
        this.getPlatformTotals(startDate, endDate),
      ]);

    return {
      topProducts,
      topStores,
      topSearches,
      topCompanies,
      demandGap,
      totals,
      periodStart: startDate,
      periodEnd: endDate,
    };
  }

  private async getPlatformTopProducts(
    startDate: Date,
    endDate: Date,
  ): Promise<TopEntityDto[]> {
    const events = await this.prisma.event.findMany({
      where: {
        targetType: 'product',
        createdAt: { gte: startDate, lte: endDate },
        type: { in: ['PRODUCT_VIEW', 'WHATSAPP_CLICK', 'PHONE_CLICK'] },
      },
      select: { targetId: true, type: true },
    });

    return this.aggregateProductEvents(events);
  }

  private async getPlatformTopStores(
    startDate: Date,
    endDate: Date,
  ): Promise<TopEntityDto[]> {
    const events = await this.prisma.event.findMany({
      where: {
        targetType: 'store',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { targetId: true },
    });

    const counts = new Map<string, number>();
    for (const event of events) {
      if (!event.targetId) continue;
      counts.set(event.targetId, (counts.get(event.targetId) ?? 0) + 1);
    }

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const storeNames = await this.resolveStoreNames(sorted.map(([id]) => id));

    return sorted.map(([id, count]) => ({
      id,
      name: storeNames.get(id) ?? 'Unknown',
      count,
    }));
  }

  private async getPlatformTopCompanies(
    startDate: Date,
    endDate: Date,
  ): Promise<TopEntityDto[]> {
    const [storeEvents, productEvents] = await Promise.all([
      this.prisma.event.findMany({
        where: {
          targetType: 'store',
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { targetId: true },
      }),
      this.prisma.event.findMany({
        where: {
          targetType: 'product',
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { targetId: true },
      }),
    ]);

    const storeIds = storeEvents
      .map((e) => e.targetId)
      .filter((id): id is string => Boolean(id));
    const productIds = productEvents
      .map((e) => e.targetId)
      .filter((id): id is string => Boolean(id));

    const [storeCompanyMap, productCompanyMap] = await Promise.all([
      this.resolveStoreCompanies(storeIds),
      this.resolveProductCompanies(productIds),
    ]);

    const counts = new Map<string, number>();
    for (const storeId of storeIds) {
      const companyId = storeCompanyMap.get(storeId);
      if (companyId) counts.set(companyId, (counts.get(companyId) ?? 0) + 1);
    }
    for (const productId of productIds) {
      const companyId = productCompanyMap.get(productId);
      if (companyId) counts.set(companyId, (counts.get(companyId) ?? 0) + 1);
    }

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const companies = await this.prisma.company.findMany({
      where: { id: { in: sorted.map(([id]) => id) } },
      select: { id: true, name: true },
    });
    const companyMap = new Map(companies.map((c) => [c.id, c.name]));

    return sorted.map(([id, count]) => ({
      id,
      name: companyMap.get(id) ?? 'Unknown',
      count,
    }));
  }

  private async getPlatformDemandGap(
    startDate: Date,
    endDate: Date,
  ): Promise<DemandGap> {
    const [totalViews, totalContacts] = await Promise.all([
      this.prisma.event.count({
        where: {
          type: 'PRODUCT_VIEW',
          targetType: 'product',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.event.count({
        where: {
          type: { in: ['WHATSAPP_CLICK', 'PHONE_CLICK'] },
          targetType: 'product',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    return this.buildDemandGap(totalViews, totalContacts);
  }

  private async getPlatformTotals(
    startDate: Date,
    endDate: Date,
  ): Promise<PlatformTotalsDto> {
    const [
      totalEvents,
      totalViews,
      totalContacts,
      totalSearches,
      activeCompanies,
      activeStores,
      activeProducts,
      activeUsers,
    ] = await Promise.all([
      this.prisma.event.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.event.count({
        where: {
          type: 'PRODUCT_VIEW',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.event.count({
        where: {
          type: { in: ['WHATSAPP_CLICK', 'PHONE_CLICK'] },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.event.count({
        where: {
          type: 'SEARCH',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.company.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.store.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.product.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.user.count({ where: { active: true } }),
    ]);

    return {
      totalEvents,
      totalViews,
      totalContacts,
      totalSearches,
      activeCompanies,
      activeStores,
      activeProducts,
      activeUsers,
    };
  }

  // ==================== SHARED HELPERS ====================

  private aggregateProductEvents(
    events: Array<{ targetId: string | null; type: string }>,
  ): Promise<TopEntityDto[]> {
    const productCounts = new Map<string, { views: number; contacts: number }>();

    for (const event of events) {
      if (!event.targetId) continue;
      const existing = productCounts.get(event.targetId) ?? { views: 0, contacts: 0 };
      if (event.type === 'PRODUCT_VIEW') {
        existing.views++;
      } else {
        existing.contacts++;
      }
      productCounts.set(event.targetId, existing);
    }

    const sorted = [...productCounts.entries()]
      .sort((a, b) => b[1].views + b[1].contacts - (a[1].views + a[1].contacts))
      .slice(0, 10);

    return this.resolveProductNames(sorted);
  }

  private async resolveProductNames(
    sorted: Array<[string, { views: number; contacts: number }]>,
  ): Promise<TopEntityDto[]> {
    if (sorted.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: sorted.map(([id]) => id) } },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return sorted.map(([id, counts]) => ({
      id,
      name: productMap.get(id) ?? 'Unknown',
      count: counts.views + counts.contacts,
    }));
  }

  private async resolveStoreNames(storeIds: string[]): Promise<Map<string, string>> {
    if (storeIds.length === 0) return new Map();

    const stores = await this.prisma.store.findMany({
      where: { id: { in: storeIds } },
      select: { id: true, name: true },
    });
    return new Map(stores.map((s) => [s.id, s.name]));
  }

  private async resolveStoreCompanies(storeIds: string[]): Promise<Map<string, string>> {
    if (storeIds.length === 0) return new Map();

    const stores = await this.prisma.store.findMany({
      where: { id: { in: storeIds } },
      select: { id: true, companyId: true },
    });
    return new Map(stores.map((s) => [s.id, s.companyId]));
  }

  private async resolveProductCompanies(
    productIds: string[],
  ): Promise<Map<string, string>> {
    if (productIds.length === 0) return new Map();

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, companyId: true },
    });
    return new Map(products.map((p) => [p.id, p.companyId]));
  }

  private buildDemandGap(totalViews: number, totalContacts: number): DemandGap {
    const conversionRate = totalViews > 0 ? (totalContacts / totalViews) * 100 : 0;
    return {
      totalViews,
      totalContacts,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }

  private emptyCompanyIntelligence(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): CompanyIntelligenceDto {
    return {
      companyId,
      topProducts: [],
      topStores: [],
      demandGap: { totalViews: 0, totalContacts: 0, conversionRate: 0 },
      periodStart: startDate,
      periodEnd: endDate,
    };
  }
}
