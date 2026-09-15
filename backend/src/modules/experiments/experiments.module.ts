import { Module } from '@nestjs/common';
import { PrismaModule } from '@/db/prisma.module.js';
import { ExperimentsController } from './controllers/experiments.controller.js';
import { ExperimentsService } from './services/experiments.service.js';
import { ExperimentAssignmentService } from './services/experiment-assignment.service.js';
import { ExperimentMetricsService } from './services/experiment-metrics.service.js';
import { RecommendationStrategyResolver } from './services/recommendation-strategy.resolver.js';

@Module({
  imports: [PrismaModule],
  controllers: [ExperimentsController],
  providers: [
    ExperimentsService,
    ExperimentAssignmentService,
    ExperimentMetricsService,
    RecommendationStrategyResolver,
  ],
  exports: [ExperimentAssignmentService, RecommendationStrategyResolver],
})
export class ExperimentsModule {}
