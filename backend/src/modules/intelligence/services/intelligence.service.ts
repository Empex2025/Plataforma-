import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { PlanAccessService } from '@/modules/plans/services/plan-access.service.js';
import { PlanFeature } from '@/modules/plans/plan.constants.js';
import {
  CompanyIntelligenceDto,
  CompanyEngagementDto,
  TopEntityDto,
  CompanyDemandGapHeuristicDto,
  TimeSeriesDto,
  TimeSeriesPointDto,
  CategoryDemandGapDto,
  UnmetSearchDto,
} from '../dto/company-intelligence.dto.js';
import {
  PlatformIntelligenceDto,
  PlatformTotalsDto,
  PlatformTimeSeriesDto,
  TopCategoryDto,
  TopRegionDto,
} from '../dto/platform-intelligence.dto.js';
import {
  HEURISTIC_DISCLAIMER,
  TOP_N,
  DEMAND_GAP_THRESHOLDS,
} from '../intelligence.constants.js';
import { resolveCompanyEntities } from '../helpers/intelligence-attribution.js';

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planAccess: PlanAccessService,
  ) {}

  // ==================== COMPANY INTELLIGENCE ====================

  async getCompanyIntelligence(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CompanyIntelligenceDto> {
    await this.assertAnalyticsAllowed(companyId);

    const { storeIds, productIds } = await resolveCompanyEntities(this.prisma, companyId);

    if (storeIds.length === 0 && productIds.length === 0) {
      return this.emptyCompanyIntelligence(companyId, startDate, endDate);
    }

    const [topProducts, topStores, engagement, contactFunnel] = await Promise.all([
      this.getCompanyTopProducts(productIds, startDate, endDate),
      this.getCompanyTopStores(storeIds, startDate, endDate),
      this.getCompanyEngagement(storeIds, productIds, startDate, endDate),
      this.getCompanyContactFunnel(storeIds, startDate, endDate),
    ]);

    return {
      companyId,
      topProducts,
      topStores,
      engagement,
      contactFunnel,
      periodStart: startDate,
      periodEnd: endDate,
    };
  }

  // ==================== COMPANY TOP LISTS ====================

  private async getCompanyTopProducts(
    productIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<TopEntityDto[]> {
    if (productIds.length === 0) return [];

    const rows = await this.prisma.$queryRaw<Array<{ targetId: string; cnt: bigint }>>`
      SELECT target_id AS "targetId", COUNT(*)::int AS cnt
      FROM events
      WHERE type = 'PRODUCT_VIEW'
        AND target_type = 'product'
        AND target_id = ANY(${productIds})
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY target_id
      ORDER BY cnt DESC
      LIMIT ${TOP_N}
    `;

    return this.resolveProductNames(rows.map((r) => ({ id: r.targetId, count: Number(r.cnt) })));
  }

  private async getCompanyTopStores(
    storeIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<TopEntityDto[]> {
    if (storeIds.length === 0) return [];

    const rows = await this.prisma.$queryRaw<Array<{ targetId: string; cnt: bigint }>>`
      SELECT target_id AS "targetId", COUNT(*)::int AS cnt
      FROM events
      WHERE type IN ('STORE_VIEW', 'STORE_FAVORITE', 'WHATSAPP_CLICK', 'PHONE_CLICK')
        AND target_type = 'store'
        AND target_id = ANY(${storeIds})
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY target_id
      ORDER BY cnt DESC
      LIMIT ${TOP_N}
    `;

    return this.resolveStoreNames(rows.map((r) => ({ id: r.targetId, count: Number(r.cnt) })));
  }

  // ==================== COMPANY ENGAGEMENT ====================

  private async getCompanyEngagement(
    storeIds: string[],
    productIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<CompanyEngagementDto> {
    const [productViews, storeViews, productFavorites, storeFavorites, contacts, reviewsCreated, reviewsApproved] =
      await Promise.all([
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
            type: 'STORE_VIEW',
            targetType: 'store',
            targetId: { in: storeIds },
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        this.prisma.event.count({
          where: {
            type: 'PRODUCT_FAVORITE',
            targetType: 'product',
            targetId: { in: productIds },
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        this.prisma.event.count({
          where: {
            type: 'STORE_FAVORITE',
            targetType: 'store',
            targetId: { in: storeIds },
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        this.prisma.event.count({
          where: {
            type: { in: ['WHATSAPP_CLICK', 'PHONE_CLICK'] },
            targetType: 'store',
            targetId: { in: storeIds },
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        this.prisma.event.count({
          where: {
            type: 'REVIEW_CREATED',
            targetType: { in: ['product', 'store'] },
            targetId: { in: [...productIds, ...storeIds] },
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        this.prisma.event.count({
          where: {
            type: 'REVIEW_APPROVED',
            targetType: { in: ['product', 'store'] },
            targetId: { in: [...productIds, ...storeIds] },
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
      ]);

    return {
      productViews,
      storeViews,
      productFavorites,
      storeFavorites,
      contacts,
      reviewsCreated,
      reviewsApproved,
    };
  }

  // ==================== COMPANY CONTACT FUNNEL ====================

  private async getCompanyContactFunnel(
    storeIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<CompanyDemandGapHeuristicDto> {
    if (storeIds.length === 0) return this.emptyCompanyDemandGap();

    const [totalStoreViews, totalContacts] = await Promise.all([
      this.prisma.event.count({
        where: {
          type: 'STORE_VIEW',
          targetType: 'store',
          targetId: { in: storeIds },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.event.count({
        where: {
          type: { in: ['WHATSAPP_CLICK', 'PHONE_CLICK'] },
          targetType: 'store',
          targetId: { in: storeIds },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    const conversionRate = totalStoreViews > 0
      ? Math.round((totalContacts / totalStoreViews) * 10000) / 100
      : 0;

    return {
      totalViews: totalStoreViews,
      totalContacts,
      conversionRate,
      heuristicDisclaimer: HEURISTIC_DISCLAIMER,
    };
  }

  // ==================== COMPANY DEMAND GAP (G1 + G3) ====================

  async getCompanyDemandGap(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    demandGap: CompanyDemandGapHeuristicDto;
    unmetSearches: UnmetSearchDto[];
    categoryGaps: CategoryDemandGapDto[];
  }> {
    await this.assertAnalyticsAllowed(companyId);

    const { storeIds, productIds } = await resolveCompanyEntities(this.prisma, companyId);
    const allTargetIds = [...productIds, ...storeIds];

    if (allTargetIds.length === 0) {
      return {
        demandGap: this.emptyCompanyDemandGap(),
        unmetSearches: [],
        categoryGaps: [],
      };
    }

    const [unmetSearches, categoryGaps] = await Promise.all([
      this.getUnmetSearches(startDate, endDate),
      this.getCompanyCategoryGaps(productIds, startDate, endDate),
    ]);

    const g1 = unmetSearches.reduce((sum, s) => sum + s.count, 0);
    const g3 = categoryGaps.reduce((sum, c) => sum + Math.max(0, c.demand - c.supply), 0);

    return {
      demandGap: {
        totalViews: g1,
        totalContacts: g3,
        conversionRate: 0,
        heuristicDisclaimer: HEURISTIC_DISCLAIMER,
      },
      unmetSearches,
      categoryGaps,
    };
  }

  // ==================== COMPANY TIME SERIES ====================

  async getCompanyTimeSeries(
    companyId: string,
    startDate: Date,
    endDate: Date,
    metrics: string[],
    granularity: 'day' | 'week',
  ): Promise<TimeSeriesDto> {
    await this.assertAnalyticsAllowed(companyId);

    const { storeIds, productIds } = await resolveCompanyEntities(this.prisma, companyId);
    const allTargetIds = [...productIds, ...storeIds];

    if (allTargetIds.length === 0) {
      return {
        granularity,
        periodStart: startDate,
        periodEnd: endDate,
        series: [],
      };
    }

    const trunc = granularity === 'week' ? 'week' : 'day';
    const seriesMap = new Map<string, Record<string, number>>();

    const queries: Array<{ metric: string; sql: Promise<Array<{ period: Date; cnt: bigint }>> }> = [];

    if (metrics.includes('views')) {
      queries.push({
        metric: 'views',
        sql: this.prisma.$queryRaw`
          SELECT date_trunc(${trunc}, created_at) AS period, COUNT(*)::int AS cnt
          FROM events
          WHERE type IN ('PRODUCT_VIEW', 'STORE_VIEW')
            AND target_type IN ('product', 'store')
            AND target_id = ANY(${allTargetIds})
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
          GROUP BY period ORDER BY period
        `,
      });
    }

    if (metrics.includes('favorites')) {
      queries.push({
        metric: 'favorites',
        sql: this.prisma.$queryRaw`
          SELECT date_trunc(${trunc}, created_at) AS period, COUNT(*)::int AS cnt
          FROM events
          WHERE type IN ('PRODUCT_FAVORITE', 'STORE_FAVORITE')
            AND target_type IN ('product', 'store')
            AND target_id = ANY(${allTargetIds})
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
          GROUP BY period ORDER BY period
        `,
      });
    }

    if (metrics.includes('contacts')) {
      queries.push({
        metric: 'contacts',
        sql: this.prisma.$queryRaw`
          SELECT date_trunc(${trunc}, created_at) AS period, COUNT(*)::int AS cnt
          FROM events
          WHERE type IN ('WHATSAPP_CLICK', 'PHONE_CLICK')
            AND target_type = 'store'
            AND target_id = ANY(${storeIds})
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
          GROUP BY period ORDER BY period
        `,
      });
    }

    if (metrics.includes('reviews')) {
      queries.push({
        metric: 'reviews',
        sql: this.prisma.$queryRaw`
          SELECT date_trunc(${trunc}, created_at) AS period, COUNT(*)::int AS cnt
          FROM events
          WHERE type IN ('REVIEW_CREATED', 'REVIEW_APPROVED')
            AND target_type IN ('product', 'store')
            AND target_id = ANY(${allTargetIds})
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
          GROUP BY period ORDER BY period
        `,
      });
    }

    const results = await Promise.all(queries.map((q) => q.sql.then((rows) => ({ metric: q.metric, rows }))));

    for (const { metric, rows } of results) {
      for (const row of rows) {
        const key = row.period.toISOString();
        if (!seriesMap.has(key)) {
          seriesMap.set(key, {});
        }
        seriesMap.get(key)![metric] = Number(row.cnt);
      }
    }

    const series: TimeSeriesPointDto[] = [...seriesMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, values]) => ({
        date,
        views: values['views'] ?? 0,
        favorites: values['favorites'] ?? 0,
        contacts: values['contacts'] ?? 0,
        reviews: values['reviews'] ?? 0,
      }));

    return {
      granularity,
      periodStart: startDate,
      periodEnd: endDate,
      series,
    };
  }

  // ==================== PLATFORM INTELLIGENCE ====================

  async getPlatformIntelligence(
    startDate: Date,
    endDate: Date,
  ): Promise<PlatformIntelligenceDto> {
    const [topProducts, topStores, topSearches, topCompanies, topCategories, totals] =
      await Promise.all([
        this.getPlatformTopProducts(startDate, endDate),
        this.getPlatformTopStores(startDate, endDate),
        this.getTopSearches(startDate, endDate),
        this.getPlatformTopCompanies(startDate, endDate),
        this.getPlatformTopCategories(startDate, endDate),
        this.getPlatformTotals(startDate, endDate),
      ]);

    return {
      topProducts,
      topStores,
      topSearches,
      topCompanies,
      topCategories,
      totals,
      periodStart: startDate,
      periodEnd: endDate,
    };
  }

  private async getPlatformTopProducts(
    startDate: Date,
    endDate: Date,
  ): Promise<TopEntityDto[]> {
    const rows = await this.prisma.$queryRaw<Array<{ targetId: string; cnt: bigint }>>`
      SELECT target_id AS "targetId", COUNT(*)::int AS cnt
      FROM events
      WHERE type = 'PRODUCT_VIEW'
        AND target_type = 'product'
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY target_id
      ORDER BY cnt DESC
      LIMIT ${TOP_N}
    `;

    return this.resolveProductNames(rows.map((r) => ({ id: r.targetId, count: Number(r.cnt) })));
  }

  private async getPlatformTopStores(
    startDate: Date,
    endDate: Date,
  ): Promise<TopEntityDto[]> {
    const rows = await this.prisma.$queryRaw<Array<{ targetId: string; cnt: bigint }>>`
      SELECT target_id AS "targetId", COUNT(*)::int AS cnt
      FROM events
      WHERE type IN ('STORE_VIEW', 'STORE_FAVORITE', 'WHATSAPP_CLICK', 'PHONE_CLICK')
        AND target_type = 'store'
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY target_id
      ORDER BY cnt DESC
      LIMIT ${TOP_N}
    `;

    return this.resolveStoreNames(rows.map((r) => ({ id: r.targetId, count: Number(r.cnt) })));
  }

  async getTopSearches(
    startDate: Date,
    endDate: Date,
  ): Promise<TopEntityDto[]> {
    const rows = await this.prisma.$queryRaw<Array<{ query: string; cnt: bigint }>>`
      SELECT metadata->>'query' AS query, COUNT(*)::int AS cnt
      FROM events
      WHERE type = 'SEARCH'
        AND metadata->>'query' IS NOT NULL
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY metadata->>'query'
      ORDER BY cnt DESC
      LIMIT ${TOP_N}
    `;

    return rows.map((r) => ({
      id: r.query,
      name: r.query,
      count: Number(r.cnt),
    }));
  }

  private async getPlatformTopCompanies(
    startDate: Date,
    endDate: Date,
  ): Promise<TopEntityDto[]> {
    const rows = await this.prisma.$queryRaw<Array<{ companyId: string; cnt: bigint }>>`
      WITH company_events AS (
        SELECT
          COALESCE(
            (SELECT company_id FROM stores WHERE id = e.target_id AND e.target_type = 'store'),
            (SELECT company_id FROM products WHERE id = e.target_id AND e.target_type = 'product')
          ) AS comp_id,
          COUNT(*)::int AS cnt
        FROM events e
        WHERE e.target_type IN ('product', 'store')
          AND e.target_id IS NOT NULL
          AND e.created_at >= ${startDate}
          AND e.created_at <= ${endDate}
        GROUP BY comp_id
      )
      SELECT comp_id AS "companyId", cnt
      FROM company_events
      WHERE comp_id IS NOT NULL
      ORDER BY cnt DESC
      LIMIT ${TOP_N}
    `;

    const companies = await this.prisma.company.findMany({
      where: { id: { in: rows.map((r) => r.companyId) } },
      select: { id: true, name: true },
    });
    const companyMap = new Map(companies.map((c) => [c.id, c.name]));

    return rows.map((r) => ({
      id: r.companyId,
      name: companyMap.get(r.companyId) ?? 'Unknown',
      count: Number(r.cnt),
    }));
  }

  // ==================== PLATFORM CATEGORIES ====================

  private async getPlatformTopCategories(
    startDate: Date,
    endDate: Date,
  ): Promise<TopCategoryDto[]> {
    const rows = await this.prisma.$queryRaw<Array<{ categoryId: string; categoryName: string; demand: bigint }>>`
      SELECT
        pc.category_id AS "categoryId",
        c.name AS "categoryName",
        COUNT(e.id)::int AS demand
      FROM events e
      INNER JOIN product_categories pc ON pc.product_id = e.target_id
      INNER JOIN categories c ON c.id = pc.category_id
      WHERE e.type = 'PRODUCT_VIEW'
        AND e.target_type = 'product'
        AND e.created_at >= ${startDate}
        AND e.created_at <= ${endDate}
      GROUP BY pc.category_id, c.name
      ORDER BY demand DESC
      LIMIT ${TOP_N}
    `;

    if (rows.length === 0) return [];

    const categoryIds = rows.map((r) => r.categoryId);
    const supplyRows = await this.prisma.$queryRaw<Array<{ categoryId: string; cnt: bigint }>>`
      SELECT pc.category_id AS "categoryId", COUNT(DISTINCT pc.product_id)::int AS cnt
      FROM product_categories pc
      INNER JOIN products p ON p.id = pc.product_id
      WHERE pc.category_id = ANY(${categoryIds})
        AND p.status = 'ACTIVE'
        AND p.deleted_at IS NULL
      GROUP BY pc.category_id
    `;
    const supplyMap = new Map(supplyRows.map((r) => [r.categoryId, Number(r.cnt)]));

    return rows.map((r) => ({
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      demand: Number(r.demand),
      supply: supplyMap.get(r.categoryId) ?? 0,
    }));
  }

  // ==================== PLATFORM DEMAND GAP (G1 + G3) ====================

  async getPlatformDemandGap(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    unmetSearches: UnmetSearchDto[];
    categoryGaps: CategoryDemandGapDto[];
  }> {
    const [unmetSearches, categoryGaps] = await Promise.all([
      this.getUnmetSearches(startDate, endDate),
      this.getPlatformCategoryGaps(startDate, endDate),
    ]);

    return { unmetSearches, categoryGaps };
  }

  // ==================== PLATFORM TIME SERIES ====================

  async getPlatformTimeSeries(
    startDate: Date,
    endDate: Date,
    metrics: string[],
    granularity: 'day' | 'week',
  ): Promise<PlatformTimeSeriesDto> {
    const trunc = granularity === 'week' ? 'week' : 'day';
    const seriesMap = new Map<string, Record<string, number>>();

    const queries: Array<{ metric: string; sql: Promise<Array<{ period: Date; cnt: bigint }>> }> = [];

    if (metrics.includes('views')) {
      queries.push({
        metric: 'views',
        sql: this.prisma.$queryRaw`
          SELECT date_trunc(${trunc}, created_at) AS period, COUNT(*)::int AS cnt
          FROM events
          WHERE type IN ('PRODUCT_VIEW', 'STORE_VIEW')
            AND target_type IN ('product', 'store')
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
          GROUP BY period ORDER BY period
        `,
      });
    }

    if (metrics.includes('favorites')) {
      queries.push({
        metric: 'favorites',
        sql: this.prisma.$queryRaw`
          SELECT date_trunc(${trunc}, created_at) AS period, COUNT(*)::int AS cnt
          FROM events
          WHERE type IN ('PRODUCT_FAVORITE', 'STORE_FAVORITE')
            AND target_type IN ('product', 'store')
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
          GROUP BY period ORDER BY period
        `,
      });
    }

    if (metrics.includes('contacts')) {
      queries.push({
        metric: 'contacts',
        sql: this.prisma.$queryRaw`
          SELECT date_trunc(${trunc}, created_at) AS period, COUNT(*)::int AS cnt
          FROM events
          WHERE type IN ('WHATSAPP_CLICK', 'PHONE_CLICK')
            AND target_type = 'store'
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
          GROUP BY period ORDER BY period
        `,
      });
    }

    if (metrics.includes('reviews')) {
      queries.push({
        metric: 'reviews',
        sql: this.prisma.$queryRaw`
          SELECT date_trunc(${trunc}, created_at) AS period, COUNT(*)::int AS cnt
          FROM events
          WHERE type IN ('REVIEW_CREATED', 'REVIEW_APPROVED')
            AND target_type IN ('product', 'store')
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
          GROUP BY period ORDER BY period
        `,
      });
    }

    const results = await Promise.all(queries.map((q) => q.sql.then((rows) => ({ metric: q.metric, rows }))));

    for (const { metric, rows } of results) {
      for (const row of rows) {
        const key = row.period.toISOString();
        if (!seriesMap.has(key)) {
          seriesMap.set(key, {});
        }
        seriesMap.get(key)![metric] = Number(row.cnt);
      }
    }

    const series = [...seriesMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, values]) => ({
        date,
        views: values['views'] ?? 0,
        favorites: values['favorites'] ?? 0,
        contacts: values['contacts'] ?? 0,
        reviews: values['reviews'] ?? 0,
      }));

    return {
      granularity,
      periodStart: startDate,
      periodEnd: endDate,
      series,
    };
  }

  // ==================== SHARED: UNMET SEARCHES (G1) ====================

  private async getUnmetSearches(
    startDate: Date,
    endDate: Date,
  ): Promise<UnmetSearchDto[]> {
    const rows = await this.prisma.$queryRaw<Array<{ query: string; cnt: bigint }>>`
      SELECT metadata->>'query' AS query, COUNT(*)::int AS cnt
      FROM events
      WHERE type = 'SEARCH'
        AND metadata->>'query' IS NOT NULL
        AND (metadata->>'resultCount')::int = 0
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY metadata->>'query'
      ORDER BY cnt DESC
      LIMIT ${TOP_N}
    `;

    return rows.map((r) => ({
      query: r.query,
      count: Number(r.cnt),
    }));
  }

  // ==================== SHARED: CATEGORY GAPS (G3) ====================

  private async getCompanyCategoryGaps(
    productIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<CategoryDemandGapDto[]> {
    if (productIds.length === 0) return [];

    const rows = await this.prisma.$queryRaw<Array<{ categoryId: string; categoryName: string; demand: bigint }>>`
      SELECT
        pc.category_id AS "categoryId",
        c.name AS "categoryName",
        COUNT(e.id)::int AS demand
      FROM events e
      INNER JOIN product_categories pc ON pc.product_id = e.target_id
      INNER JOIN categories c ON c.id = pc.category_id
      WHERE e.type = 'PRODUCT_VIEW'
        AND e.target_type = 'product'
        AND e.target_id = ANY(${productIds})
        AND e.created_at >= ${startDate}
        AND e.created_at <= ${endDate}
      GROUP BY pc.category_id, c.name
      ORDER BY demand DESC
      LIMIT ${TOP_N}
    `;

    if (rows.length === 0) return [];

    const categoryIds = rows.map((r) => r.categoryId);
    const supplyRows = await this.prisma.$queryRaw<Array<{ categoryId: string; cnt: bigint }>>`
      SELECT pc.category_id AS "categoryId", COUNT(DISTINCT pc.product_id)::int AS cnt
      FROM product_categories pc
      INNER JOIN products p ON p.id = pc.product_id
      WHERE pc.category_id = ANY(${categoryIds})
        AND p.status = 'ACTIVE'
        AND p.deleted_at IS NULL
      GROUP BY pc.category_id
    `;
    const supplyMap = new Map(supplyRows.map((r) => [r.categoryId, Number(r.cnt)]));

    return rows
      .map((r) => ({
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        demand: Number(r.demand),
        supply: supplyMap.get(r.categoryId) ?? 0,
      }))
      .filter((c) => c.demand >= DEMAND_GAP_THRESHOLDS.minDemand || c.supply <= DEMAND_GAP_THRESHOLDS.maxSupply);
  }

  private async getPlatformCategoryGaps(
    startDate: Date,
    endDate: Date,
  ): Promise<CategoryDemandGapDto[]> {
    const categories = await this.getPlatformTopCategories(startDate, endDate);

    return categories
      .map((c) => ({
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        demand: c.demand,
        supply: c.supply,
      }))
      .filter((c) => c.demand >= DEMAND_GAP_THRESHOLDS.minDemand || c.supply <= DEMAND_GAP_THRESHOLDS.maxSupply);
  }

  // ==================== PLATFORM TOTALS ====================

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

  // ==================== PLATFORM REGIONS ====================

  async getTopRegions(
    startDate: Date,
    endDate: Date,
  ): Promise<TopRegionDto[]> {
    const rows = await this.prisma.$queryRaw<Array<{ city: string; state: string; cnt: bigint }>>`
      SELECT
        s.city AS city,
        s.state AS state,
        COUNT(e.id)::int AS cnt
      FROM events e
      INNER JOIN stores s ON s.id = e.target_id AND e.target_type = 'store'
      WHERE e.type IN ('STORE_VIEW', 'WHATSAPP_CLICK', 'PHONE_CLICK')
        AND s.city IS NOT NULL
        AND e.created_at >= ${startDate}
        AND e.created_at <= ${endDate}
      GROUP BY s.city, s.state
      ORDER BY cnt DESC
      LIMIT ${TOP_N}
    `;

    return rows.map((r) => ({
      city: r.city,
      state: r.state,
      count: Number(r.cnt),
    }));
  }

  // ==================== SHARED HELPERS ====================

  private async resolveProductNames(
    items: Array<{ id: string; count: number }>,
  ): Promise<TopEntityDto[]> {
    if (items.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: items.map((i) => i.id) } },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return items.map((i) => ({
      id: i.id,
      name: productMap.get(i.id) ?? 'Unknown',
      count: i.count,
    }));
  }

  private async resolveStoreNames(
    items: Array<{ id: string; count: number }>,
  ): Promise<TopEntityDto[]> {
    if (items.length === 0) return [];

    const stores = await this.prisma.store.findMany({
      where: { id: { in: items.map((i) => i.id) } },
      select: { id: true, name: true },
    });
    const storeMap = new Map(stores.map((s) => [s.id, s.name]));

    return items.map((i) => ({
      id: i.id,
      name: storeMap.get(i.id) ?? 'Unknown',
      count: i.count,
    }));
  }

  private emptyCompanyDemandGap(): CompanyDemandGapHeuristicDto {
    return {
      totalViews: 0,
      totalContacts: 0,
      conversionRate: 0,
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
      engagement: {
        productViews: 0,
        storeViews: 0,
        productFavorites: 0,
        storeFavorites: 0,
        contacts: 0,
        reviewsCreated: 0,
        reviewsApproved: 0,
      },
      contactFunnel: this.emptyCompanyDemandGap(),
      periodStart: startDate,
      periodEnd: endDate,
    };
  }

  private async assertAnalyticsAllowed(companyId: string): Promise<void> {
    const allowed = await this.planAccess.can(companyId, PlanFeature.ANALYTICS);
    if (!allowed) {
      throw new ForbiddenException(
        'Intelligence features require an active analytics plan. Upgrade to PRO or higher.',
      );
    }
  }
}
