import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { PrismaService } from '@/db/prisma.service.js';
import { IntelligenceService } from '@/modules/intelligence/services/intelligence.service.js';
import { CampaignMetricsService } from '@/modules/advertising/services/campaign-metrics.service.js';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: {
    event: { count: jest.Mock };
    campaign: { findMany: jest.Mock; count: jest.Mock };
    campaignMetric: { aggregate: jest.Mock };
    store: { findMany: jest.Mock };
    product: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let intelligence: {
    getCompanyIntelligence: jest.Mock;
    getCompanyTimeSeries: jest.Mock;
    getPlatformIntelligence: jest.Mock;
    getPlatformTimeSeries: jest.Mock;
    getTopRegions: jest.Mock;
  };
  let campaignMetrics: {
    getAggregatedMetrics: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      event: { count: jest.fn().mockResolvedValue(0) },
      campaign: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      campaignMetric: { aggregate: jest.fn().mockResolvedValue({ _sum: { impressions: 0, clicks: 0 } }) },
      store: { findMany: jest.fn().mockResolvedValue([{ id: 'store-1' }]) },
      product: { findMany: jest.fn().mockResolvedValue([{ id: 'product-1' }]) },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };

    intelligence = {
      getCompanyIntelligence: jest.fn().mockResolvedValue({
        companyId: 'company-1',
        topProducts: [{ id: 'p1', name: 'Product 1', count: 10 }],
        topStores: [{ id: 's1', name: 'Store 1', count: 5 }],
        engagement: {
          productViews: 10,
          storeViews: 5,
          productFavorites: 2,
          storeFavorites: 1,
          contacts: 3,
          reviewsCreated: 1,
          reviewsApproved: 1,
        },
        contactFunnel: { totalViews: 5, totalContacts: 3, conversionRate: 60, heuristicDisclaimer: 'HEURISTICO_NAO_DEFINITIVO' as const },
        periodStart: new Date('2026-09-01'),
        periodEnd: new Date('2026-09-14'),
      }),
      getCompanyTimeSeries: jest.fn().mockResolvedValue({
        granularity: 'day' as const,
        periodStart: new Date('2026-09-01'),
        periodEnd: new Date('2026-09-14'),
        series: [{ date: '2026-09-01', views: 10, favorites: 2, contacts: 1, reviews: 0 }],
      }),
      getPlatformIntelligence: jest.fn().mockResolvedValue({
        topProducts: [{ id: 'p1', name: 'Product 1', count: 100 }],
        topStores: [{ id: 's1', name: 'Store 1', count: 50 }],
        topSearches: [{ id: 'iphone', name: 'iphone', count: 30 }],
        topCompanies: [{ id: 'c1', name: 'Company 1', count: 200 }],
        topCategories: [{ categoryId: 'cat1', categoryName: 'Electronics', demand: 50, supply: 10 }],
        totals: { totalEvents: 500, totalViews: 200, totalContacts: 50, totalSearches: 100, activeCompanies: 5, activeStores: 10, activeProducts: 30, activeUsers: 20 },
        periodStart: new Date('2026-09-01'),
        periodEnd: new Date('2026-09-14'),
      }),
      getPlatformTimeSeries: jest.fn().mockResolvedValue({
        granularity: 'day' as const,
        periodStart: new Date('2026-09-01'),
        periodEnd: new Date('2026-09-14'),
        series: [{ date: '2026-09-01', views: 50, favorites: 10, contacts: 5, reviews: 2 }],
      }),
      getTopRegions: jest.fn().mockResolvedValue([{ city: 'São Paulo', state: 'SP', count: 100 }]),
    };

    campaignMetrics = {
      getAggregatedMetrics: jest.fn().mockResolvedValue({ impressions: 0, clicks: 0, ctr: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prisma },
        { provide: IntelligenceService, useValue: intelligence },
        { provide: CampaignMetricsService, useValue: campaignMetrics },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCompanyOverview', () => {
    it('should return overview with totals and growth', async () => {
      const result = await service.getCompanyOverview('company-1', { period: '30d' });

      expect(result.period).toBeDefined();
      expect(result.totals).toBeDefined();
      expect(result.previousTotals).toBeDefined();
      expect(result.growth).toBeDefined();
      expect(result.advertising).toBeDefined();
      expect(intelligence.getCompanyIntelligence).toHaveBeenCalledTimes(2);
    });

    it('should handle empty intelligence gracefully', async () => {
      intelligence.getCompanyIntelligence
        .mockResolvedValueOnce({
          companyId: 'company-1',
          topProducts: [],
          topStores: [],
          engagement: {
            productViews: 10,
            storeViews: 5,
            productFavorites: 2,
            storeFavorites: 1,
            contacts: 3,
            reviewsCreated: 1,
            reviewsApproved: 1,
          },
          contactFunnel: { totalViews: 5, totalContacts: 3, conversionRate: 60, heuristicDisclaimer: 'HEURISTICO_NAO_DEFINITIVO' as const },
          periodStart: new Date('2026-09-01'),
          periodEnd: new Date('2026-09-14'),
        })
        .mockRejectedValueOnce(new Error('plan denied'));

      const result = await service.getCompanyOverview('company-1', { period: '30d' });

      expect(result.totals.views).toBe(15);
      expect(result.previousTotals.views).toBe(0);
    });
  });

  describe('getCompanyTimeseries', () => {
    it('should delegate to intelligence', async () => {
      const result = await service.getCompanyTimeseries('company-1', { period: '7d', granularity: 'day' });

      expect(result.granularity).toBe('day');
      expect(result.series).toHaveLength(1);
      expect(intelligence.getCompanyTimeSeries).toHaveBeenCalled();
    });
  });

  describe('getCompanyProducts', () => {
    it('should return top products with growth', async () => {
      const result = await service.getCompanyProducts('company-1', { period: '30d' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('p1');
      expect(result.items[0].growth).toBeDefined();
    });
  });

  describe('getCompanyStores', () => {
    it('should return top stores with growth', async () => {
      const result = await service.getCompanyStores('company-1', { period: '30d' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('s1');
    });
  });

  describe('getCompanyFunnel', () => {
    it('should return funnel stages', async () => {
      const result = await service.getCompanyFunnel('company-1', { period: '30d' });

      expect(result.stages).toHaveLength(5);
      expect(result.disclaimer).toBe('HEURISTICO_NAO_DEFINITIVO');
      expect(result.stages[0].stage).toBe('search');
      expect(result.stages[4].stage).toBe('route');
    });

    it('should handle empty entities', async () => {
      prisma.store.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.getCompanyFunnel('company-1', { period: '30d' });

      expect(result.stages.every((s) => s.count === 0)).toBe(true);
    });
  });

  describe('getCompanyAdvertising', () => {
    it('should return advertising metrics', async () => {
      prisma.campaign.findMany.mockResolvedValue([{
        id: 'camp-1',
        name: 'Test Campaign',
        status: 'ACTIVE',
        metrics: [{ impressions: 100, clicks: 5 }],
      }]);

      const result = await service.getCompanyAdvertising('company-1', { period: '30d' });

      expect(result.totals.impressions).toBe(100);
      expect(result.totals.clicks).toBe(5);
      expect(result.totals.ctr).toBe(5);
      expect(result.campaigns).toHaveLength(1);
    });

    it('should handle zero impressions', async () => {
      const result = await service.getCompanyAdvertising('company-1', { period: '30d' });

      expect(result.totals.ctr).toBe(0);
    });
  });

  describe('getPlatformOverview', () => {
    it('should return platform overview', async () => {
      const result = await service.getPlatformOverview({ period: '30d' });

      expect(result.totals).toBeDefined();
      expect(result.growth).toBeDefined();
      expect(result.advertising).toBeDefined();
    });
  });

  describe('getPlatformTimeseries', () => {
    it('should delegate to intelligence', async () => {
      const result = await service.getPlatformTimeseries({ period: '7d' });

      expect(result.series).toHaveLength(1);
    });
  });

  describe('getPlatformProducts', () => {
    it('should return top products', async () => {
      const result = await service.getPlatformProducts({ period: '30d' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('p1');
    });
  });

  describe('getPlatformStores', () => {
    it('should return top stores', async () => {
      const result = await service.getPlatformStores({ period: '30d' });

      expect(result.items).toHaveLength(1);
    });
  });

  describe('getPlatformCategories', () => {
    it('should return top categories', async () => {
      const result = await service.getPlatformCategories({ period: '30d' });

      expect(result).toHaveLength(1);
      expect(result[0].categoryId).toBe('cat1');
    });
  });

  describe('getPlatformSearches', () => {
    it('should return search analytics', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ query: 'iphone', cnt: 10n }]);
      prisma.$queryRaw.mockResolvedValueOnce([{ query: 'samsung', cnt: 3n }]);
      prisma.$queryRaw.mockResolvedValueOnce([{ cnt: 50n }]);
      prisma.$queryRaw.mockResolvedValueOnce([{ cnt: 20n }]);

      const result = await service.getPlatformSearches({ period: '30d' });

      expect(result.topSearches).toHaveLength(1);
      expect(result.emptyResultSearches).toHaveLength(1);
      expect(result.totalSearches).toBe(50);
      expect(result.uniqueSearchTerms).toBe(20);
    });
  });

  describe('getPlatformRegions', () => {
    it('should return regions', async () => {
      const result = await service.getPlatformRegions({ period: '30d' });

      expect(result.regions).toHaveLength(1);
      expect(result.regions[0].city).toBe('São Paulo');
    });
  });

  describe('getPlatformAdvertising', () => {
    it('should return advertising metrics', async () => {
      prisma.campaignMetric.aggregate.mockResolvedValueOnce({
        _sum: { impressions: 200, clicks: 10 },
      });
      prisma.campaign.findMany.mockResolvedValueOnce([{
        id: 'camp-1',
        name: 'Platform Campaign',
        status: 'ACTIVE',
        metrics: [{ impressions: 200, clicks: 10 }],
      }]);

      const result = await service.getPlatformAdvertising({ period: '30d' });

      expect(result.totals.impressions).toBe(200);
      expect(result.totals.clicks).toBe(10);
      expect(result.totals.ctr).toBe(5);
    });
  });

  describe('date validation', () => {
    it('should reject custom period without dates', async () => {
      await expect(service.getCompanyOverview('company-1', { period: 'custom' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject startDate > endDate', async () => {
      await expect(service.getCompanyOverview('company-1', {
        period: 'custom',
        startDate: '2026-09-14',
        endDate: '2026-09-01',
      })).rejects.toThrow(BadRequestException);
    });

    it('should reject range > 90 days', async () => {
      await expect(service.getCompanyOverview('company-1', {
        period: 'custom',
        startDate: '2026-06-01',
        endDate: '2026-09-14',
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('zero denominator', () => {
    it('should handle zero previous values in growth', async () => {
      intelligence.getCompanyIntelligence
        .mockResolvedValueOnce({
          companyId: 'company-1',
          topProducts: [],
          topStores: [],
          engagement: {
            productViews: 10, storeViews: 5, productFavorites: 2,
            storeFavorites: 1, contacts: 3, reviewsCreated: 1, reviewsApproved: 1,
          },
          contactFunnel: { totalViews: 5, totalContacts: 3, conversionRate: 60, heuristicDisclaimer: 'HEURISTICO_NAO_DEFINITIVO' as const },
          periodStart: new Date('2026-09-01'),
          periodEnd: new Date('2026-09-14'),
        })
        .mockRejectedValueOnce(new Error('no previous data'));

      const result = await service.getCompanyOverview('company-1', { period: '30d' });

      expect(result.growth.views.percentage).toBeNull();
      expect(result.growth.views.absolute).toBe(15);
    });
  });
});
