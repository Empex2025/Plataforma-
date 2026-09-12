import { Module } from '@nestjs/common';
import { PrismaModule } from '@/db/prisma.module.js';
import { EventsModule } from '@/modules/events/events.module.js';
import { PublicController } from './controllers/public.controller.js';
import { PublicProductsService } from './services/public-products.service.js';
import { PublicStoresService } from './services/public-stores.service.js';
import { PublicComparisonService } from './services/public-comparison.service.js';

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
