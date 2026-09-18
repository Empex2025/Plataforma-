import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';

const IMPRESSIONS_PER_MILLE = 1000;

export interface AggregatedCampaignMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  cpc: number | null;
  cpm: number | null;
  conversions: number;
  revenue: number;
}

@Injectable()
export class CampaignMetricsService {
  private readonly logger = new Logger(CampaignMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordImpression(campaignId: string): Promise<void> {
    try {
      const today = this.startOfToday();
      const cost = await this.resolveImpressionCost(campaignId);

      await this.prisma.campaignMetric.upsert({
        where: {
          campaignId_date: { campaignId, date: today },
        },
        update: {
          impressions: { increment: 1 },
          ...(cost > 0 && { spend: { increment: cost } }),
        },
        create: {
          campaignId,
          date: today,
          impressions: 1,
          clicks: 0,
          spend: cost,
        },
      });

      await this.applyCampaignSpend(campaignId, cost);
    } catch (error) {
      this.logger.warn(`Failed to record impression for campaign ${campaignId}: ${error}`);
    }
  }

  async recordClick(campaignId: string): Promise<void> {
    try {
      const today = this.startOfToday();
      const cost = await this.resolveClickCost(campaignId);

      await this.prisma.campaignMetric.upsert({
        where: {
          campaignId_date: { campaignId, date: today },
        },
        update: {
          clicks: { increment: 1 },
          ...(cost > 0 && { spend: { increment: cost } }),
        },
        create: {
          campaignId,
          date: today,
          impressions: 0,
          clicks: 1,
          spend: cost,
        },
      });

      await this.applyCampaignSpend(campaignId, cost);
    } catch (error) {
      this.logger.warn(`Failed to record click for campaign ${campaignId}: ${error}`);
    }
  }

  async getAggregatedMetrics(campaignId: string): Promise<AggregatedCampaignMetrics> {
    const metrics = await this.prisma.campaignMetric.aggregate({
      where: { campaignId },
      _sum: { impressions: true, clicks: true, spend: true, conversions: true, revenue: true },
    });

    const impressions = metrics._sum.impressions ?? 0;
    const clicks = metrics._sum.clicks ?? 0;
    const spend = this.toNumber(metrics._sum.spend);
    const conversions = metrics._sum.conversions ?? 0;
    const revenue = this.toNumber(metrics._sum.revenue);

    return {
      impressions,
      clicks,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      spend,
      cpc: clicks > 0 ? spend / clicks : null,
      cpm: impressions > 0 ? (spend / impressions) * IMPRESSIONS_PER_MILLE : null,
      conversions,
      revenue,
    };
  }

  private async applyCampaignSpend(campaignId: string, cost: number): Promise<void> {
    if (cost <= 0) return;

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { spend: { increment: cost } },
    });
  }

  private async resolveImpressionCost(campaignId: string): Promise<number> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { costPerMille: true },
    });

    if (!campaign?.costPerMille) return 0;

    return this.toNumber(campaign.costPerMille) / IMPRESSIONS_PER_MILLE;
  }

  private async resolveClickCost(campaignId: string): Promise<number> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { costPerClick: true },
    });

    if (!campaign?.costPerClick) return 0;

    return this.toNumber(campaign.costPerClick);
  }

  private startOfToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
