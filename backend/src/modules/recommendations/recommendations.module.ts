import { Module } from '@nestjs/common';
import {
  RecommendationsController,
  ProductRecommendationsController,
  StoreRecommendationsController,
} from './controllers/recommendations.controller.js';
import { RecommendationsService } from './services/recommendations.service.js';
import { SemanticRetrievalService } from './services/semantic-retrieval.service.js';
import { AiRecommendationService } from './services/ai-recommendation.service.js';
import { PrismaModule } from '@/db/prisma.module.js';
import { IntelligenceModule } from '@/modules/intelligence/intelligence.module.js';
import { AiModule } from '@/modules/ai/ai.module.js';

@Module({
  imports: [PrismaModule, IntelligenceModule, AiModule],
  controllers: [
    RecommendationsController,
    ProductRecommendationsController,
    StoreRecommendationsController,
  ],
  providers: [RecommendationsService, SemanticRetrievalService, AiRecommendationService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
