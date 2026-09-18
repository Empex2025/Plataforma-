import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { CampaignMetricsService } from './campaign-metrics.service.js';
import { PrismaService } from '@/db/prisma.service.js';

describe('CampaignMetricsService', () => {
  let service: CampaignMetricsService;
  let prisma: {
    campaignMetric: {
      upsert: jest.Mock;
      aggregate: jest.Mock;
    };
    campaign: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      campaignMetric: {
        upsert: jest.fn(),
        aggregate: jest.fn(),
      },
      campaign: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignMetricsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CampaignMetricsService>(CampaignMetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordImpression', () => {
    it('should create a new metric record when none exists', async () => {
      prisma.campaignMetric.upsert.mockResolvedValue({});

      await service.recordImpression('campaign-1');

      expect(prisma.campaignMetric.upsert).toHaveBeenCalled();
      const call = prisma.campaignMetric.upsert.mock.calls[0][0];
      expect(call.where.campaignId_date.campaignId).toBe('campaign-1');
      expect(call.create.impressions).toBe(1);
    });
  });

  describe('recordClick', () => {
    it('should create a new metric record when none exists', async () => {
      prisma.campaignMetric.upsert.mockResolvedValue({});

      await service.recordClick('campaign-1');

      expect(prisma.campaignMetric.upsert).toHaveBeenCalled();
      const call = prisma.campaignMetric.upsert.mock.calls[0][0];
      expect(call.where.campaignId_date.campaignId).toBe('campaign-1');
      expect(call.create.clicks).toBe(1);
    });
  });

  describe('getAggregatedMetrics', () => {
    it('should return aggregated metrics', async () => {
      prisma.campaignMetric.aggregate.mockResolvedValue({
        _sum: { impressions: 100, clicks: 10 },
        _count: 5,
      });

      const result = await service.getAggregatedMetrics('campaign-1');

      expect(result.impressions).toBe(100);
      expect(result.clicks).toBe(10);
      expect(result.ctr).toBe(10);
    });

    it('should return zero CTR when no impressions', async () => {
      prisma.campaignMetric.aggregate.mockResolvedValue({
        _sum: { impressions: 0, clicks: 0 },
        _count: 0,
      });

      const result = await service.getAggregatedMetrics('campaign-1');

      expect(result.impressions).toBe(0);
      expect(result.clicks).toBe(0);
      expect(result.ctr).toBe(0);
      expect(result.spend).toBe(0);
      expect(result.cpc).toBeNull();
      expect(result.cpm).toBeNull();
    });

    it('should compute spend, cpc and cpm from aggregate', async () => {
      prisma.campaignMetric.aggregate.mockResolvedValue({
        _sum: { impressions: 1000, clicks: 20, spend: 50, conversions: 5, revenue: 250 },
        _count: 3,
      });

      const result = await service.getAggregatedMetrics('campaign-1');

      expect(result.spend).toBe(50);
      expect(result.cpc).toBe(2.5);
      expect(result.cpm).toBe(50);
      expect(result.ctr).toBe(2);
      expect(result.conversions).toBe(5);
      expect(result.revenue).toBe(250);
    });
  });

  describe('cost accrual (P-03)', () => {
    it('should accrue cost per click when configured', async () => {
      prisma.campaign.findUnique.mockResolvedValue({ costPerClick: 5 });
      prisma.campaignMetric.upsert.mockResolvedValue({});
      prisma.campaign.update.mockResolvedValue({});

      await service.recordClick('campaign-1');

      const upsert = prisma.campaignMetric.upsert.mock.calls[0][0];
      expect(upsert.create.spend).toBe(5);
      expect(upsert.update.spend).toEqual({ increment: 5 });
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { spend: { increment: 5 } },
      });
    });

    it('should accrue cost per mille for impressions', async () => {
      prisma.campaign.findUnique.mockResolvedValue({ costPerMille: 20 });
      prisma.campaignMetric.upsert.mockResolvedValue({});
      prisma.campaign.update.mockResolvedValue({});

      await service.recordImpression('campaign-1');

      const upsert = prisma.campaignMetric.upsert.mock.calls[0][0];
      expect(upsert.create.spend).toBeCloseTo(0.02);
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { spend: { increment: 0.02 } },
      });
    });

    it('should not accrue cost when no pricing is configured', async () => {
      prisma.campaign.findUnique.mockResolvedValue(null);
      prisma.campaignMetric.upsert.mockResolvedValue({});

      await service.recordClick('campaign-1');

      expect(prisma.campaign.update).not.toHaveBeenCalled();
    });

    it('should accumulate spend atomically across concurrent events', async () => {
      prisma.campaign.findUnique.mockResolvedValue({ costPerClick: 1 });
      prisma.campaignMetric.upsert.mockResolvedValue({});
      prisma.campaign.update.mockResolvedValue({});

      await Promise.all([
        service.recordClick('campaign-1'),
        service.recordClick('campaign-1'),
        service.recordClick('campaign-1'),
      ]);

      expect(prisma.campaign.update).toHaveBeenCalledTimes(3);
      for (const call of prisma.campaign.update.mock.calls) {
        expect(call[0].data.spend).toEqual({ increment: 1 });
      }
    });
  });
});
