import { Module } from '@nestjs/common';
import { DiscoveryController } from './discovery.controller.js';
import { DiscoveryService } from './services/discovery.service.js';
import { TrendingService } from './services/trending.service.js';
import { NewItemsService } from './services/new-items.service.js';
import { PrismaModule } from '@/db/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryService, TrendingService, NewItemsService],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
