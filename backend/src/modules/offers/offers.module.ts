import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller.js';
import { OffersService } from './services/offers.service.js';
import { SearchModule } from '@/modules/search/search.module.js';
import { AlertsModule } from '@/modules/alerts/alerts.module.js';
import { NotificationsModule } from '@/modules/notifications/notifications.module.js';

@Module({
  imports: [SearchModule, AlertsModule, NotificationsModule],
  controllers: [OffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}
