import { Module } from '@nestjs/common';
import { AdvertisingController } from './controllers/advertising.controller.js';
import { AdminAdvertisingController } from './controllers/admin-advertising.controller.js';
import { CampaignsService } from './services/campaigns.service.js';
import { EligibilityService } from './services/eligibility.service.js';
import { SponsoredSearchService } from './services/sponsored-search.service.js';
import { CampaignMetricsService } from './services/campaign-metrics.service.js';
import { AdvertisingEventTrackingService } from './services/advertising-event-tracking.service.js';
import { PlansModule } from '@/modules/plans/plans.module.js';
import { EventsModule } from '@/modules/events/events.module.js';

@Module({
  imports: [PlansModule, EventsModule],
  controllers: [AdvertisingController, AdminAdvertisingController],
  providers: [
    CampaignsService,
    EligibilityService,
    SponsoredSearchService,
    CampaignMetricsService,
    AdvertisingEventTrackingService,
  ],
  exports: [
    CampaignsService,
    EligibilityService,
    SponsoredSearchService,
    CampaignMetricsService,
    AdvertisingEventTrackingService,
  ],
})
export class AdvertisingModule {}
