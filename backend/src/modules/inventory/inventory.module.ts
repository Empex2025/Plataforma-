import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './services/inventory.service.js';
import { SearchModule } from '@/modules/search/search.module.js';
import { AlertsModule } from '@/modules/alerts/alerts.module.js';
import { NotificationsModule } from '@/modules/notifications/notifications.module.js';

@Module({
  imports: [SearchModule, AlertsModule, NotificationsModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
