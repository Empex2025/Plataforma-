import { Injectable, Logger } from '@nestjs/common';
import { EventsService } from '@/modules/events/events.service.js';
import { EventType } from '@/generated/prisma/enums.js';
import { CampaignMetricsService } from './campaign-metrics.service.js';

@Injectable()
export class AdvertisingEventTrackingService {
  private readonly logger = new Logger(AdvertisingEventTrackingService.name);

  constructor(
    private readonly eventsService: EventsService,
    private readonly campaignMetricsService: CampaignMetricsService,
  ) {}

  async trackImpression(
    campaignId: string,
    targetType: string,
    targetId: string,
    userId: string | null = null,
  ): Promise<void> {
    try {
      await this.campaignMetricsService.recordImpression(campaignId);

      void this.eventsService
        .track(
          {
            type: EventType.AD_IMPRESSION,
            metadata: { campaignId, targetType, targetId },
          },
          userId,
        )
        .catch((err) => this.logger.warn(`Failed to track AD_IMPRESSION event: ${err}`));
    } catch (error) {
      this.logger.warn(`Failed to track impression: ${error}`);
    }
  }

  async trackClick(
    campaignId: string,
    targetType: string,
    targetId: string,
    userId: string | null = null,
  ): Promise<void> {
    try {
      await this.campaignMetricsService.recordClick(campaignId);

      void this.eventsService
        .track(
          {
            type: EventType.AD_CLICK,
            metadata: { campaignId, targetType, targetId },
          },
          userId,
        )
        .catch((err) => this.logger.warn(`Failed to track AD_CLICK event: ${err}`));
    } catch (error) {
      this.logger.warn(`Failed to track click: ${error}`);
    }
  }
}
