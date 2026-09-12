import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import {
  CompanyIntelligenceDto,
  TopEntityDto,
  DemandGapHeuristicDto,
} from '../dto/company-intelligence.dto.js';
import { PlatformIntelligenceDto, PlatformTotalsDto } from '../dto/platform-intelligence.dto.js';

const HEURISTIC_DISCLAIMER = 'HEURISTICO_NAO_DEFINITIVO' as const;

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== COMPANY INTELLIGENCE ====================

  /**
   * Company-scoped intelligence. Metrics are derived from Event rows by
   * resolving the company's stores and products — Event has no companyId.
   *
   * Importante sobre os sinais heurísticos (G1, G3, Demand Gap):
   * - São indicadores de oportunidade, NÃO demanda real ou comprovada.
   * - O valor serve apenas para priorização.
   */
  async getCompanyIntelligence(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CompanyIntelligenceDto> {
    const storeIds = await this.getCompanyStoreIds(companyId);
    const productIds = await this.getCompanyProductIds(companyId);

    if (storeIds.length === 0 && productIds.length === 0) {
      return this.emptyCompanyIntelligence(companyId, startDate, endDate);
    }

    const [topProducts, topStores, demandGap] = await Promise.all([
      this.getTopProducts(productIds, startDate, endDate),
      this.getTopStores(storeIds, startDate, endDate),
      this.getCompanyDemandGap(productIds, startDate, endDate),
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

  /**
   * Calcula os sinais heurísticos de Demand Gap para o escopo da empresa.
   *
   * Regras de atribuição (heurísticas, NÃO definitivas):
   * - totalSearches: número de eventos SEARCH no período realizados por
   *   sessões ou usuários que também tiveram pelo menos um PRODUCT_VIEW
   *   em produtos da empresa. Heurística usada para aproximar buscas
   *   "relevantes" ao catálogo.
   * - totalViews: count(PRODUCT_VIEW where targetId in companyProductIds)
   * - totalContacts: count(WHATSAPP_CLICK|PHONE_CLICK where targetId in companyProductIds)
   * - G1 = max(0, totalSearches - totalViews)  — gap busca → visualização
   * - G3 = max(0, totalViews - totalContacts) — gap visualização → contato
   * - DemandGap = G1 + G3
   */
  private async getCompanyDemandGap(
    productIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<DemandGapHeuristicDto> {
    if (productIds.length === 0) {
      return this.emptyDemandGap();
    }

    const [totalViews, totalContacts, totalSearches] = await Promise.all([
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
      this.getCompanyRelevantSearches(productIds, startDate, endDate),
    ]);

    return this.buildDemandGapHeuristic(totalViews, totalContacts, totalSearches);
  }

  /**
   * Heurística: contabiliza SEARCH realizados por usuários/sessões que
   * também interagiram (PRODUCT_VIEW) com produtos da empresa no período.
   * Não é um valor definitivo — apenas um sinal.
   */
  private async getCompanyRelevantSearches(
    productIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const viewingEvents = await this.prisma.event.findMany({
      where: {
        type: 'PRODUCT_VIEW',
        targetType: 'product',
        targetId: { in: productIds },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { userId: true, sessionId: true },
    });

    const userIds = new Set<string>();
    const sessionIds = new Set<string>();
    for (const ev of viewingEvents) {
      if (ev.userId) userIds.add(ev.userId);
      if (ev.sessionId) sessionIds.add(ev.sessionId);
    }

    if (userIds.size === 0 && sessionIds.size === 0) return 0;

    const orClauses: Array<{ userId: { in: string[] } } | { sessionId: { in: string[] } }> = [];
    if (userIds.size > 0) orClauses.push({ userId: { in: [...userIds] } });
    if (sessionIds.size > 0) orClauses.push({ sessionId: { in: [...sessionIds] } });

    const whereClause = {
      type: 'SEARCH' as const,
      createdAt: { gte: startDate, lte: endDate },
      OR: orClauses,
    };

    return this.prisma.event.count({ where: whereClause });
  }

  // ==================== PLATFORM INTELLIGENCE ====================

  /**
   * Platform-wide intelligence (admin only). Aggregates across all companies.
   * Os sinais heurísticos G1/G3/Demand Gap aparecem aqui com a mesma
   * ressalva: NÃO representam demanda real ou comprovada.
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

  /**
   * Demand Gap heurístico para a plataforma toda.
   * - totalSearches: count(SEARCH) global no período
   * - G1 = max(0, totalSearches - totalViews)
   * - G3 = max(0, totalViews - totalContacts)
   * - DemandGap = G1 + G3
   */
  private async getPlatformDemandGap(
    startDate: Date,
    endDate: Date,
  ): Promise<DemandGapHeuristicDto> {
    const [totalViews, totalContacts, totalSearches] = await Promise.all([
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
      this.prisma.event.count({
        where: {
          type: 'SEARCH',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    return this.buildDemandGapHeuristic(totalViews, totalContacts, totalSearches);
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

  /**
   * Constrói o DTO heurístico do Demand Gap.
   * Regra de fórmula oficial: DemandGap = G1 + G3.
   */
  private buildDemandGapHeuristic(
    totalViews: number,
    totalContacts: number,
    totalSearches: number,
  ): DemandGapHeuristicDto {
    const g1 = Math.max(0, totalSearches - totalViews);
    const g3 = Math.max(0, totalViews - totalContacts);
    const demandGap = g1 + g3;
    const conversionRate = totalViews > 0 ? (totalContacts / totalViews) * 100 : 0;

    return {
      g1,
      g3,
      demandGap,
      totalViews,
      totalContacts,
      conversionRate: Math.round(conversionRate * 100) / 100,
      totalSearches,
      heuristicDisclaimer: HEURISTIC_DISCLAIMER,
    };
  }

  private emptyDemandGap(): DemandGapHeuristicDto {
    return {
      g1: 0,
      g3: 0,
      demandGap: 0,
      totalViews: 0,
      totalContacts: 0,
      conversionRate: 0,
      totalSearches: 0,
      heuristicDisclaimer: HEURISTIC_DISCLAIMER,
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
      demandGap: this.emptyDemandGap(),
      periodStart: startDate,
      periodEnd: endDate,
    };
  }
}
