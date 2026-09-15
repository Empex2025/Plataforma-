import { Module } from '@nestjs/common';
import { AnalyticsController } from './controllers/analytics.controller.js';
import { PlatformAnalyticsController } from './controllers/platform-analytics.controller.js';
import { AnalyticsService } from './services/analytics.service.js';
import { IntelligenceModule } from '@/modules/intelligence/intelligence.module.js';
import { AdvertisingModule } from '@/modules/advertising/advertising.module.js';
import { PrismaModule } from '@/db/prisma.module.js';

@Module({
  imports: [IntelligenceModule, AdvertisingModule, PrismaModule],
  controllers: [AnalyticsController, PlatformAnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
