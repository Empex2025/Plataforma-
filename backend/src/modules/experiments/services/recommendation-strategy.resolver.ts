import { Injectable, Logger } from '@nestjs/common';
import {
  RECOMMENDATION_EXPERIMENT_DOMAIN,
  VARIANT_CONFIG_RECOMMENDATION_MODE,
} from '../experiments.constants.js';
import type { RecommendationStrategy, ResolvedRecommendationStrategy } from '../experiments.types.js';
import { ExperimentAssignmentService } from './experiment-assignment.service.js';

/**
 * Resolves which recommendation strategy the current subject should receive.
 *
 * This is the ONLY place that couples experiments with recommendations, so no
 * `if (experimentKey === ...)` is scattered in the ranking code. When there is
 * no RUNNING experiment (or the subject is not eligible) it returns null and
 * Recommendations keeps its default (Phase 20) behavior.
 */
@Injectable()
export class RecommendationStrategyResolver {
  private readonly logger = new Logger(RecommendationStrategyResolver.name);

  constructor(private readonly assignmentService: ExperimentAssignmentService) {}

  async resolve(userId: string | null | undefined): Promise<ResolvedRecommendationStrategy | null> {
    // v1: experiments target authenticated users only.
    if (!userId) return null;

    try {
      const assignment = await this.assignmentService.assignActiveInDomain(
        RECOMMENDATION_EXPERIMENT_DOMAIN,
        { type: 'user', id: userId },
      );
      if (!assignment) return null;

      const strategy = this.extractStrategy(assignment.config);
      if (!strategy) return null;

      return {
        strategy,
        experimentKey: assignment.experimentKey,
        variantKey: assignment.variantKey,
      };
    } catch (error) {
      this.logger.warn(`Failed to resolve recommendation strategy: ${(error as Error).message}`);
      return null;
    }
  }

  private extractStrategy(config: Record<string, unknown>): RecommendationStrategy | null {
    const mode = config[VARIANT_CONFIG_RECOMMENDATION_MODE];
    return mode === 'deterministic' || mode === 'hybrid' ? mode : null;
  }
}
