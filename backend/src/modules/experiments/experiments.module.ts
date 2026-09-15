import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '@/db/prisma.module.js';
import { ExperimentsController } from './controllers/experiments.controller.js';
import { ExperimentsService } from './services/experiments.service.js';
import { ExperimentAssignmentService } from './services/experiment-assignment.service.js';
import { ExperimentMetricsService } from './services/experiment-metrics.service.js';
import { ExperimentStatisticsService } from './services/experiment-statistics.service.js';
import { RecommendationStrategyResolver } from './services/recommendation-strategy.resolver.js';
import { EXPERIMENT_STATISTICS_CONFIG } from './statistics/statistics.constants.js';
import { buildExperimentStatisticsConfig } from './statistics/statistics-config.provider.js';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [ExperimentsController],
  providers: [
    {
      provide: EXPERIMENT_STATISTICS_CONFIG,
      inject: [ConfigService],
      useFactory: buildExperimentStatisticsConfig,
    },
    ExperimentsService,
    ExperimentAssignmentService,
    ExperimentMetricsService,
    ExperimentStatisticsService,
    RecommendationStrategyResolver,
  ],
  exports: [ExperimentAssignmentService, RecommendationStrategyResolver],
})
export class ExperimentsModule {}
