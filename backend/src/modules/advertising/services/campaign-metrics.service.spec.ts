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
  };

  beforeEach(async () => {
    prisma = {
      campaignMetric: {
        upsert: jest.fn(),
        aggregate: jest.fn(),
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
    });
  });
});
