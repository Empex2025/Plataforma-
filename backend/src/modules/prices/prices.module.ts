import { Module } from '@nestjs/common';
import { PricesController } from './prices.controller.js';
import { PricesService } from './services/prices.service.js';
import { SearchModule } from '@/modules/search/search.module.js';
import { AlertsModule } from '@/modules/alerts/alerts.module.js';

@Module({
  imports: [SearchModule, AlertsModule],
  controllers: [PricesController],
  providers: [PricesService],
  exports: [PricesService],
})
export class PricesModule {}
