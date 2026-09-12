import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module.js';
import { EventsModule } from '../events/events.module.js';
import { PublicController } from './public.controller.js';
import { PublicProductsService } from './public-products.service.js';
import { PublicStoresService } from './public-stores.service.js';
import { PublicComparisonService } from './public-comparison.service.js';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [PublicController],
  providers: [
    PublicProductsService,
    PublicStoresService,
    PublicComparisonService,
  ],
  exports: [PublicProductsService, PublicStoresService, PublicComparisonService],
})
export class PublicModule {}
