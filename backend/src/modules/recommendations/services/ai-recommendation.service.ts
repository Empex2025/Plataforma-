import { Injectable, Logger } from '@nestjs/common';
import type { EmbeddingEntityType } from '@/modules/ai/ai.types.js';
import { EmbeddingService } from '@/modules/ai/services/embedding.service.js';
import type { SimilarityMatch } from '@/modules/ai/vector-store/vector-store.interface.js';
import {
  RecommendationReasonCode,
  REASON_LABELS,
} from '../recommendations.constants.js';
import type { RecommendationItemDto } from '../dto/recommendation-response.dto.js';
import { combineHybridScore } from '../helpers/hybrid-ranking.js';
import { AI_RECOMMENDATION_THRESHOLDS } from '../ai-recommendation.constants.js';
import { SemanticRetrievalService } from './semantic-retrieval.service.js';

export type RankableItem = RecommendationItemDto & {
  _score: number;
  _behavioralScore?: number;
};

export interface RankOptions {
  searchQuery?: string;
  semanticEntityId?: string;
  behavioralById?: Map<string, number>;
}

@Injectable()
export class AiRecommendationService {
  private readonly logger = new Logger(AiRecommendationService.name);

  constructor(
    private readonly semantic: SemanticRetrievalService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  get enabled(): boolean {
    return this.semantic.enabled;
  }

  async rank(
    entityType: EmbeddingEntityType,
    items: RankableItem[],
    options: RankOptions = {},
  ): Promise<RankableItem[]> {
    if (!this.enabled || items.length === 0) return items;

    const queryVector = await this.resolveQueryVector(options);
    const behavioralById = options.behavioralById;
    const behavioralAvailable = Boolean(behavioralById && behavioralById.size > 0);
    const semanticAvailable = Boolean(queryVector);

    if (!semanticAvailable && !behavioralAvailable) return items;

    const ids = items.map((item) => item.id);
    const semanticScores = queryVector
      ? await this.semantic.scoreEntities(entityType, queryVector, ids)
      : new Map<string, number>();

    return items.map((item) => {
      const semanticScore = semanticScores.get(item.id);
      const behavioralScore = behavioralById?.get(item.id);

      const score = combineHybridScore({
        deterministic: item._score,
        semantic: semanticScore,
        behavioral: behavioralScore,
      });

      return {
        ...item,
        _score: score,
        reasons: this.withSemanticReason(item.reasons, semanticScore),
      };
    });
  }

  async findSimilarEntityIds(
    entityType: EmbeddingEntityType,
    entityId: string,
    limit: number,
    excludeIds: string[] = [],
  ): Promise<SimilarityMatch[]> {
    if (!this.enabled) return [];
    try {
      const vector = await this.semantic.getEntityVector(entityType, entityId);
      if (!vector) return [];
      return await this.semantic.findSimilarIds(entityType, vector, limit, excludeIds);
    } catch (error) {
      this.logger.warn(`Semantic candidate expansion failed: ${(error as Error).message}`);
      return [];
    }
  }

  private async resolveQueryVector(options: RankOptions): Promise<number[] | null> {
    try {
      if (options.searchQuery && options.searchQuery.trim().length > 0) {
        return await this.embeddingService.embedQuery(options.searchQuery.trim());
      }
      if (options.semanticEntityId) {
        return await this.semantic.getEntityVector('product', options.semanticEntityId);
      }
      return null;
    } catch (error) {
      this.logger.warn(`Semantic query embedding failed: ${(error as Error).message}`);
      return null;
    }
  }

  private withSemanticReason(
    reasons: RecommendationItemDto['reasons'],
    semanticScore: number | undefined,
  ) {
    if (typeof semanticScore !== 'number' || semanticScore < AI_RECOMMENDATION_THRESHOLDS.semanticReason) {
      return reasons;
    }
    if (reasons.some((reason) => reason.code === RecommendationReasonCode.SEMANTICALLY_RELEVANT)) {
      return reasons;
    }
    return [
      ...reasons,
      {
        code: RecommendationReasonCode.SEMANTICALLY_RELEVANT,
        label: REASON_LABELS[RecommendationReasonCode.SEMANTICALLY_RELEVANT],
      },
    ];
  }
}
