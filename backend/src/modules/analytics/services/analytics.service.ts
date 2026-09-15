import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { IntelligenceService } from '@/modules/intelligence/services/intelligence.service.js';
import { resolvePeriod } from '@/modules/intelligence/helpers/intelligence-period.js';
import { CampaignMetricsService } from '@/modules/advertising/services/campaign-metrics.service.js';
import { computeGrowth, computeGrowthMap } from '../helpers/analytics-growth.js';
import { type AnalyticsQueryDto, validateAnalyticsQuery, parseMetrics } from '../dto/analytics-query.dto.js';
import { type AnalyticsOverviewDto, type AnalyticsTotalsDto, type AnalyticsPeriodDto } from '../dto/analytics-overview.dto.js';
import { type AnalyticsTimeseriesDto } from '../dto/analytics-timeseries.dto.js';
import { type AnalyticsTopEntitiesDto, type AnalyticsTopCategoryDto } from '../dto/analytics-top.dto.js';
import { type AnalyticsFunnelDto, type AnalyticsFunnelStageDto } from '../dto/analytics-funnel.dto.js';
import { type AnalyticsSearchDto } from '../dto/analytics-search.dto.js';
import { type AnalyticsAdvertisingDto, type AnalyticsCampaignDto } from '../dto/analytics-advertising.dto.js';
import { type AnalyticsRegionsDto } from '../dto/analytics-region.dto.js';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly intelligence: IntelligenceService,
    private readonly campaignMetrics: CampaignMetricsService,
  ) {}


  async getCompanyOverview(companyId: string, query: AnalyticsQueryDto): Promise<AnalyticsOverviewDto> {
    this.validateQuery(query);
    const { start, end } = this.resolveQueryPeriod(query);
    const prev = this.previousPeriod(start, end);

    const [currentIntel, prevIntel, advertising] = await Promise.all([
      this.intelligence.getCompanyIntelligence(companyId, start, end),
      this.safeGetCompanyIntelligence(companyId, prev.start, prev.end),
      this.getCompanyAdvertisingInternal(companyId, start, end),
    ]);

    const currentTotals = this.buildCompanyTotals(currentIntel.engagement, currentIntel.contactFunnel.totalContacts);
    const previousTotals = this.buildCompanyTotals(prevIntel?.engagement, prevIntel?.contactFunnel.totalContacts ?? 0);

    const currentMap: Record<string, number> = {
      views: currentTotals.views,
      favorites: currentTotals.favorites,
      contacts: currentTotals.contacts,
      reviews: currentTotals.reviews,
    };
    const prevMap: Record<string, number> = {
      views: previousTotals.views,
      favorites: previousTotals.favorites,
      contacts: previousTotals.contacts,
      reviews: previousTotals.reviews,
    };

    return {
      period: this.buildPeriod(start, end, prev.start, prev.end),
      totals: currentTotals,
      previousTotals,
      growth: computeGrowthMap(currentMap, prevMap),
      advertising,
    };
  }

  async getCompanyTimeseries(companyId: string, query: AnalyticsQueryDto): Promise<AnalyticsTimeseriesDto> {
    this.validateQuery(query);
    const { start, end } = this.resolveQueryPeriod(query);
    const granularity = (query.granularity ?? 'day') as 'day' | 'week';
    const metrics = parseMetrics(query.metrics);

    const ts = await this.intelligence.getCompanyTimeSeries(companyId, start, end, metrics, granularity);

    return {
      granularity: ts.granularity,
      period: { start: start.toISOString(), end: end.toISOString() },
      series: ts.series.map((p) => ({
        date: p.date,
        views: p.views,
        favorites: p.favorites,
        contacts: p.contacts,
        reviews: p.reviews,
      })),
    };
  }

  async getCompanyProducts(companyId: string, query: AnalyticsQueryDto): Promise<AnalyticsTopEntitiesDto> {
    this.validateQuery(query);
    const { start, end } = this.resolveQueryPeriod(query);
    const prev = this.previousPeriod(start, end);

    const [current, previous] = await Promise.all([
      this.intelligence.getCompanyIntelligence(companyId, start, end),
      this.safeGetCompanyIntelligence(companyId, prev.start, prev.end),
    ]);

    const prevMap = new Map((previous?.topProducts ?? []).map((p) => [p.id, p.count]));

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      items: current.topProducts.map((p) => ({
        id: p.id,
        name: p.name,
        metric: p.count,
        growth: computeGrowth(p.count, prevMap.get(p.id) ?? 0),
      })),
    };
  }

  async getCompanyStores(companyId: string, query: AnalyticsQueryDto): Promise<AnalyticsTopEntitiesDto> {
    this.validateQuery(query);
    const { start, end } = this.resolveQueryPeriod(query);
    const prev = this.previousPeriod(start, end);

    const [current, previous] = await Promise.all([
      this.intelligence.getCompanyIntelligence(companyId, start, end),
      this.safeGetCompanyIntelligence(companyId, prev.start, prev.end),
    ]);

    const prevMap = new Map((previous?.topStores ?? []).map((s) => [s.id, s.count]));

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      items: current.topStores.map((s) => ({
        id: s.id,
        name: s.name,
        metric: s.count,
        growth: computeGrowth(s.count, prevMap.get(s.id) ?? 0),
      })),
    };
  }

  async getCompanyFunnel(companyId: string, query: AnalyticsQueryDto): Promise<AnalyticsFunnelDto> {
    this.validateQuery(query);
    const { start, end } = this.resolveQueryPeriod(query);

    const { storeIds, productIds } = await this.resolveCompanyEntities(companyId);
    const allTargetIds = [...productIds, ...storeIds];

    if (allTargetIds.length === 0) {
      return this.emptyFunnel(start, end);
    }

    const [searches, views, favorites, contacts, routes] = await Promise.all([
      this.prisma.event.count({
        where: { type: 'SEARCH', createdAt: { gte: start, lte: end } },
      }),
      this.prisma.event.count({
        where: {
          type: { in: ['PRODUCT_VIEW', 'STORE_VIEW'] },
          targetId: { in: allTargetIds },
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.event.count({
        where: {
          type: { in: ['PRODUCT_FAVORITE', 'STORE_FAVORITE'] },
          targetId: { in: allTargetIds },
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.event.count({
        where: {
          type: { in: ['WHATSAPP_CLICK', 'PHONE_CLICK'] },
          targetId: { in: allTargetIds },
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.event.count({
        where: {
          type: 'ROUTE_REQUESTED',
          targetId: { in: allTargetIds },
          createdAt: { gte: start, lte: end },
        },
      }),
    ]);

    const stages: AnalyticsFunnelStageDto[] = [
      { stage: 'search', count: searches, conversionFromPrevious: null },
      { stage: 'view', count: views, conversionFromPrevious: searches > 0 ? this.round2((views / searches) * 100) : null },
      { stage: 'favorite', count: favorites, conversionFromPrevious: views > 0 ? this.round2((favorites / views) * 100) : null },
      { stage: 'contact', count: contacts, conversionFromPrevious: favorites > 0 ? this.round2((contacts / favorites) * 100) : null },
      { stage: 'route', count: routes, conversionFromPrevious: contacts > 0 ? this.round2((routes / contacts) * 100) : null },
    ];

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      stages,
      disclaimer: 'HEURISTICO_NAO_DEFINITIVO',
    };
  }

  async getCompanyAdvertising(companyId: string, query: AnalyticsQueryDto): Promise<AnalyticsAdvertisingDto> {
    this.validateQuery(query);
    const { start, end } = this.resolveQueryPeriod(query);

    const campaigns = await this.prisma.campaign.findMany({
      where: { companyId, status: { in: ['ACTIVE', 'PAUSED'] } },
      include: {
        metrics: {
          where: { date: { gte: start, lte: end } },
        },
      },
    });

    let totalImpressions = 0;
    let totalClicks = 0;

    const campaignDtos: AnalyticsCampaignDto[] = campaigns.map((c) => {
      const impressions = c.metrics.reduce((sum, m) => sum + m.impressions, 0);
      const clicks = c.metrics.reduce((sum, m) => sum + m.clicks, 0);
      const ctr = impressions > 0 ? this.round2((clicks / impressions) * 100) : 0;
      totalImpressions += impressions;
      totalClicks += clicks;
      return { id: c.id, name: c.name, status: c.status, impressions, clicks, ctr };
    });

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      totals: {
        impressions: totalImpressions,
        clicks: totalClicks,
        ctr: totalImpressions > 0 ? this.round2((totalClicks / totalImpressions) * 100) : 0,
      },
      campaigns: campaignDtos,
    };
  }


  async getPlatformOverview(query: AnalyticsQueryDto): Promise<AnalyticsOverviewDto> {
    this.validateQuery(query);
    const { start, end } = this.resolveQueryPeriod(query);
    const prev = this.previousPeriod(start, end);

    const [currentIntel, prevIntel, advertising] = await Promise.all([
      this.intelligence.getPlatformIntelligence(start, end),
      this.safeGetPlatformIntelligence(prev.start, prev.end),
      this.getPlatformAdvertisingInternal(start, end),
    ]);

    const currentTotals: AnalyticsTotalsDto = {
      views: currentIntel.totals.totalViews,
      favorites: 0,
      contacts: currentIntel.totals.totalContacts,
      reviews: 0,
      searches: currentIntel.totals.totalSearches,
      whatsappClicks: 0,
      phoneClicks: 0,
      routeRequests: 0,
    };

    const previousTotals: AnalyticsTotalsDto = {
      views: prevIntel?.totals.totalViews ?? 0,
      favorites: 0,
      contacts: prevIntel?.totals.totalContacts ?? 0,
      reviews: 0,
      searches: prevIntel?.totals.totalSearches ?? 0,
      whatsappClicks: 0,
      phoneClicks: 0,
      routeRequests: 0,
    };

    return {
      period: this.buildPeriod(start, end, prev.start, prev.end),
      totals: currentTotals,
      previousTotals,
      growth: computeGrowthMap(
        { views: currentTotals.views, contacts: currentTotals.contacts, searches: currentTotals.searches },
        { views: previousTotals.views, contacts: previousTotals.contacts, searches: previousTotals.searches },
      ),
      advertising,
    };
  }

  async getPlatformTimeseries(query: AnalyticsQueryDto): Promise<AnalyticsTimeseriesDto> {
    this.validateQuery(query);
    const { start, end } = this.resolveQueryPeriod(query);
    const granularity = (query.granularity ?? 'day') as 'day' | 'week';
    const metrics = parseMetrics(query.metrics);

    const ts = await this.intelligence.getPlatformTimeSeries(start, end, metrics, granularity);

    return {
      granularity: ts.granularity,
      period: { start: start.toISOString(), end: end.toISOString() },
      series: ts.series.map((p) => ({
        date: p.date,
        views: p.views,
        favorites: p.favorites,
        contacts: p.contacts,
        reviews: p.reviews,
      })),
    };
  }

  async getPlatformProducts(query: AnalyticsQueryDto): Promise<AnalyticsTopEntitiesDto> {
    this.validateQuery(query);
    const { start, end } = this.resolveQueryPeriod(query);

    const intel = await this.intelligence.getPlatformIntelligence(start, end);

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      items: intel.topProducts.map((p) => ({
        id: p.id,
        name: p.name,
        metric: p.count,
      })),
    };
  }

  async getPlatformStores(query: AnalyticsQueryDto): Promise<AnalyticsTopEntitiesDto> {
    this.validateQuery(query);
    const { start, end } = this.resolveQueryPeriod(query);

    const intel = await this.intelligence.getPlatformIntelligence(start, end);

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      items: intel.topStores.map((s) => ({
        id: s.id,
        name: s.name,
        metric: s.count,
      })),
    };
  }

  async getPlatformCategories(query: AnalyticsQueryDto): Promise<AnalyticsTopCategoryDto[]> {
    this.validateQuery(query);
    const { start, end } = this.resolveQueryPeriod(query);

    const intel = await this.intelligence.getPlatformIntelligence(start, end);

    return intel.topCategories.map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      demand: c.demand,
      supply: c.supply,
    }));
  }

  async getPlatformSearches(query: AnalyticsQueryDto): Promise<AnalyticsSearchDto> {
    this.validateQuery(query);
    const { start, end } = this.resolveQueryPeriod(query);

    const [topSearches, emptySearches, totalRow, uniqueRow] = await Promise.all([
      this.prisma.$queryRaw<Array<{ query: string; cnt: bigint }>>`
        SELECT metadata->>'query' AS query, COUNT(*)::int AS cnt
        FROM events
        WHERE type = 'SEARCH'
          AND metadata->>'query' IS NOT NULL
          AND created_at >= ${start}
          AND created_at <= ${end}
        GROUP BY metadata->>'query'
        ORDER BY cnt DESC
        LIMIT 10
      `,
      this.prisma.$queryRaw<Array<{ query: string; cnt: bigint }>>`
        SELECT metadata->>'query' AS query, COUNT(*)::int AS cnt
        FROM events
        WHERE type = 'SEARCH'
          AND metadata->>'query' IS NOT NULL
          AND metadata->>'resultCount' = '0'
          AND created_at >= ${start}
          AND created_at <= ${end}
        GROUP BY metadata->>'query'
        ORDER BY cnt DESC
        LIMIT 10
      `,
      this.prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(*)::int AS cnt
        FROM events
        WHERE type = 'SEARCH'
          AND created_at >= ${start}
          AND created_at <= ${end}
      `,
      this.prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(DISTINCT metadata->>'query')::int AS cnt
        FROM events
        WHERE type = 'SEARCH'
          AND metadata->>'query' IS NOT NULL
          AND created_at >= ${start}
          AND created_at <= ${end}
      `,
    ]);

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      topSearches: topSearches.map((r) => ({ query: r.query, count: Number(r.cnt) })),
      emptyResultSearches: emptySearches.map((r) => ({ query: r.query, count: Number(r.cnt) })),
      totalSearches: Number(totalRow[0]?.cnt ?? 0),
      uniqueSearchTerms: Number(uniqueRow[0]?.cnt ?? 0),
    };
  }

  async getPlatformRegions(query: AnalyticsQueryDto): Promise<AnalyticsRegionsDto> {
    this.validateQuery(query);
    const { start, end } = this.resolveQueryPeriod(query);

    const regions = await this.intelligence.getTopRegions(start, end);

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      regions: regions.map((r) => ({ city: r.city, state: r.state, count: r.count })),
    };
  }

  async getPlatformAdvertising(query: AnalyticsQueryDto): Promise<AnalyticsAdvertisingDto> {
    this.validateQuery(query);
    const { start, end } = this.resolveQueryPeriod(query);
    return this.getPlatformAdvertisingInternal(start, end);
  }


  private validateQuery(query: AnalyticsQueryDto): void {
    try {
      validateAnalyticsQuery(query);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : 'Invalid query parameters');
    }
  }

  private resolveQueryPeriod(query: AnalyticsQueryDto): { start: Date; end: Date } {
    return resolvePeriod(query.period, query.startDate, query.endDate);
  }

  private previousPeriod(start: Date, end: Date): { start: Date; end: Date } {
    const durationMs = end.getTime() - start.getTime();
    return {
      start: new Date(start.getTime() - durationMs),
      end: new Date(start.getTime() - 1),
    };
  }

  private buildPeriod(start: Date, end: Date, prevStart: Date, prevEnd: Date): AnalyticsPeriodDto {
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      previousStart: prevStart.toISOString(),
      previousEnd: prevEnd.toISOString(),
    };
  }

  private buildCompanyTotals(
    engagement?: { productViews: number; storeViews: number; productFavorites: number; storeFavorites: number; contacts: number; reviewsCreated: number; reviewsApproved: number },
    totalContacts?: number,
  ): AnalyticsTotalsDto {
    if (!engagement) {
      return { views: 0, favorites: 0, contacts: 0, reviews: 0, searches: 0, whatsappClicks: 0, phoneClicks: 0, routeRequests: 0 };
    }
    return {
      views: engagement.productViews + engagement.storeViews,
      favorites: engagement.productFavorites + engagement.storeFavorites,
      contacts: totalContacts ?? engagement.contacts,
      reviews: engagement.reviewsCreated + engagement.reviewsApproved,
      searches: 0,
      whatsappClicks: 0,
      phoneClicks: 0,
      routeRequests: 0,
    };
  }

  private async safeGetCompanyIntelligence(companyId: string, start: Date, end: Date) {
    try {
      return await this.intelligence.getCompanyIntelligence(companyId, start, end);
    } catch {
      return null;
    }
  }

  private async safeGetPlatformIntelligence(start: Date, end: Date) {
    try {
      return await this.intelligence.getPlatformIntelligence(start, end);
    } catch {
      return null;
    }
  }

  private async resolveCompanyEntities(companyId: string) {
    const [stores, products] = await Promise.all([
      this.prisma.store.findMany({
        where: { companyId, deletedAt: null, status: 'ACTIVE' },
        select: { id: true },
      }),
      this.prisma.product.findMany({
        where: { companyId, deletedAt: null, status: 'ACTIVE' },
        select: { id: true },
      }),
    ]);
    return { storeIds: stores.map((s) => s.id), productIds: products.map((p) => p.id) };
  }

  private async getCompanyAdvertisingInternal(companyId: string, start: Date, end: Date): Promise<AnalyticsAdvertisingDto> {
    const aggregate = await this.prisma.campaignMetric.aggregate({
      where: {
        campaign: { companyId },
        date: { gte: start, lte: end },
      },
      _sum: { impressions: true, clicks: true },
    });

    const impressions = aggregate._sum.impressions ?? 0;
    const clicks = aggregate._sum.clicks ?? 0;
    const ctr = impressions > 0 ? this.round2((clicks / impressions) * 100) : 0;

    const campaigns = await this.prisma.campaign.findMany({
      where: { companyId, status: { in: ['ACTIVE', 'PAUSED'] } },
      include: {
        metrics: {
          where: { date: { gte: start, lte: end } },
        },
      },
    });

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      totals: { impressions, clicks, ctr },
      campaigns: campaigns.map((c) => {
        const cImpressions = c.metrics.reduce((sum, m) => sum + m.impressions, 0);
        const cClicks = c.metrics.reduce((sum, m) => sum + m.clicks, 0);
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          impressions: cImpressions,
          clicks: cClicks,
          ctr: cImpressions > 0 ? this.round2((cClicks / cImpressions) * 100) : 0,
        };
      }),
    };
  }

  private async getPlatformAdvertisingInternal(start: Date, end: Date): Promise<AnalyticsAdvertisingDto> {
    const aggregate = await this.prisma.campaignMetric.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { impressions: true, clicks: true },
    });

    const impressions = aggregate._sum.impressions ?? 0;
    const clicks = aggregate._sum.clicks ?? 0;
    const ctr = impressions > 0 ? this.round2((clicks / impressions) * 100) : 0;

    const campaigns = await this.prisma.campaign.findMany({
      where: { status: { in: ['ACTIVE', 'PAUSED'] } },
      include: {
        metrics: {
          where: { date: { gte: start, lte: end } },
        },
      },
    });

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      totals: { impressions, clicks, ctr },
      campaigns: campaigns.map((c) => {
        const cImpressions = c.metrics.reduce((sum, m) => sum + m.impressions, 0);
        const cClicks = c.metrics.reduce((sum, m) => sum + m.clicks, 0);
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          impressions: cImpressions,
          clicks: cClicks,
          ctr: cImpressions > 0 ? this.round2((cClicks / cImpressions) * 100) : 0,
        };
      }),
    };
  }

  private emptyFunnel(start: Date, end: Date): AnalyticsFunnelDto {
    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      stages: [
        { stage: 'search', count: 0, conversionFromPrevious: null },
        { stage: 'view', count: 0, conversionFromPrevious: null },
        { stage: 'favorite', count: 0, conversionFromPrevious: null },
        { stage: 'contact', count: 0, conversionFromPrevious: null },
        { stage: 'route', count: 0, conversionFromPrevious: null },
      ],
      disclaimer: 'HEURISTICO_NAO_DEFINITIVO',
    };
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
