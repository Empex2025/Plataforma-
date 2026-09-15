import { Module } from '@nestjs/common';
import {
  RecommendationsController,
  ProductRecommendationsController,
  StoreRecommendationsController,
} from './controllers/recommendations.controller.js';
import { RecommendationsService } from './services/recommendations.service.js';
import { PrismaModule } from '@/db/prisma.module.js';
import { IntelligenceModule } from '@/modules/intelligence/intelligence.module.js';

@Module({
  imports: [PrismaModule, IntelligenceModule],
  controllers: [
    RecommendationsController,
    ProductRecommendationsController,
    StoreRecommendationsController,
  ],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
