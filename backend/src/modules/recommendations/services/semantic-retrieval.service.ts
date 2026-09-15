import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AI_CONFIG,
  EMBEDDING_PROVIDER,
  VECTOR_STORE,
  EMBEDDING_VERSION,
} from '@/modules/ai/ai.constants.js';
import type { AiConfig, EmbeddingEntityType } from '@/modules/ai/ai.types.js';
import type { EmbeddingProvider } from '@/modules/ai/providers/embedding-provider.interface.js';
import type { VectorStore, SimilarityMatch } from '@/modules/ai/vector-store/vector-store.interface.js';
import { EmbeddingService } from '@/modules/ai/services/embedding.service.js';

/**
 * Read-only semantic layer over the vector store.
 *
 * It only performs retrieval and scoring. It never generates embeddings inside a
 * CRUD path (query embeddings are generated on demand, entity embeddings are
 * precomputed by the worker).
 */
@Injectable()
export class SemanticRetrievalService {
  constructor(
    @Optional() @Inject(AI_CONFIG) private readonly config: AiConfig | null,
    @Optional() @Inject(EMBEDDING_PROVIDER) private readonly provider: EmbeddingProvider | null,
    @Optional() @Inject(VECTOR_STORE) private readonly vectorStore: VectorStore | null,
    @Optional() private readonly embeddingService: EmbeddingService | null,
  ) {}

  get enabled(): boolean {
    return Boolean(this.config?.enabled && this.provider && this.vectorStore);
  }

  async embedText(text: string): Promise<number[] | null> {
    if (!this.embeddingService) return null;
    return this.embeddingService.embedQuery(text);
  }

  async getEntityVector(
    entityType: EmbeddingEntityType,
    entityId: string,
  ): Promise<number[] | null> {
    if (!this.enabled || !this.vectorStore || !this.provider) return null;
    const record = await this.vectorStore.get(entityType, entityId, this.provider.model, EMBEDDING_VERSION);
    return record?.vector ?? null;
  }

  async findSimilarIds(
    entityType: EmbeddingEntityType,
    vector: number[],
    limit: number,
    excludeIds: string[] = [],
  ): Promise<SimilarityMatch[]> {
    if (!this.enabled || !this.vectorStore) return [];

    const excluded = new Set(excludeIds);
    const matches = await this.vectorStore.findSimilar(entityType, vector, {
      limit: limit + excluded.size,
    });

    return matches.filter((match) => !excluded.has(match.entityId)).slice(0, limit);
  }

  async scoreEntities(
    entityType: EmbeddingEntityType,
    vector: number[],
    entityIds: string[],
  ): Promise<Map<string, number>> {
    if (!this.enabled || !this.vectorStore || entityIds.length === 0) return new Map();

    const matches = await this.vectorStore.findSimilar(entityType, vector, {
      limit: entityIds.length,
      allowedIds: entityIds,
    });

    return new Map(matches.map((match) => [match.entityId, match.score]));
  }
}
