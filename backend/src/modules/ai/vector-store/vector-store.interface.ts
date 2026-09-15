import type { EmbeddingEntityType } from '../ai.types.js';

export interface EmbeddingRecord {
  entityType: EmbeddingEntityType;
  entityId: string;
  model: string;
  version: string;
  dimension: number;
  contentHash: string;
  vector: number[];
}

export interface SimilarityMatch {
  entityId: string;
  score: number;
}

export interface FindSimilarOptions {
  limit: number;
  allowedIds?: string[];
}

export interface VectorStore {
  upsert(record: EmbeddingRecord): Promise<void>;
  get(
    entityType: EmbeddingEntityType,
    entityId: string,
    model: string,
    version: string,
  ): Promise<EmbeddingRecord | null>;
  delete(entityType: EmbeddingEntityType, entityId: string): Promise<void>;
  findSimilar(
    entityType: EmbeddingEntityType,
    vector: number[],
    options: FindSimilarOptions,
  ): Promise<SimilarityMatch[]>;
  isAvailable(): Promise<boolean>;
}
