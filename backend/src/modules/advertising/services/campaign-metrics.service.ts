import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';

@Injectable()
export class CampaignMetricsService {
  private readonly logger = new Logger(CampaignMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record an impression for a campaign.
   */
  async recordImpression(campaignId: string): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.prisma.campaignMetric.upsert({
        where: {
          campaignId_date: { campaignId, date: today },
        },
        update: {
          impressions: { increment: 1 },
        },
        create: {
          campaignId,
          date: today,
          impressions: 1,
          clicks: 0,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to record impression for campaign ${campaignId}: ${error}`);
    }
  }

  /**
   * Record a click for a campaign.
   */
  async recordClick(campaignId: string): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.prisma.campaignMetric.upsert({
        where: {
          campaignId_date: { campaignId, date: today },
        },
        update: {
          clicks: { increment: 1 },
        },
        create: {
          campaignId,
          date: today,
          impressions: 0,
          clicks: 1,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to record click for campaign ${campaignId}: ${error}`);
    }
  }

  /**
   * Get aggregated metrics for a campaign.
   */
  async getAggregatedMetrics(
    campaignId: string,
  ): Promise<{ impressions: number; clicks: number; ctr: number }> {
    const metrics = await this.prisma.campaignMetric.aggregate({
      where: { campaignId },
      _sum: { impressions: true, clicks: true },
    });

    const impressions = metrics._sum.impressions ?? 0;
    const clicks = metrics._sum.clicks ?? 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

    return { impressions, clicks, ctr };
  }
}
