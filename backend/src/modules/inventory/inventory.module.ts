import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';
import { SearchModule } from '../search/search.module.js';
import { AlertsModule } from '../alerts/alerts.module.js';

@Module({
  imports: [SearchModule, AlertsModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
