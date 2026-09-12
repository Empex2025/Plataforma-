import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller.js';
import { OffersService } from './services/offers.service.js';
import { SearchModule } from '@/modules/search/search.module.js';

@Module({
  imports: [SearchModule],
  controllers: [OffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}
