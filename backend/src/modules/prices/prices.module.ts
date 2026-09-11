import { Module } from '@nestjs/common';
import { PricesController } from './prices.controller.js';
import { PricesService } from './prices.service.js';
import { SearchModule } from '../search/search.module.js';

@Module({
  imports: [SearchModule],
  controllers: [PricesController],
  providers: [PricesService],
  exports: [PricesService],
})
export class PricesModule {}
