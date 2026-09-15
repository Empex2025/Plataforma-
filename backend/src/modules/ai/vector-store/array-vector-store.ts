import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { MAX_SEMANTIC_SCAN } from '../ai.constants.js';
import type { EmbeddingEntityType } from '../ai.types.js';
import { cosineSimilarity, cosineToSemanticScore } from './cosine.js';
import type {
  EmbeddingRecord,
  FindSimilarOptions,
  SimilarityMatch,
  VectorStore,
} from './vector-store.interface.js';

@Injectable()
export class ArrayVectorStore implements VectorStore {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(record: EmbeddingRecord): Promise<void> {
    await this.prisma.embedding.upsert({
      where: {
        entityType_entityId_model_version: {
          entityType: record.entityType,
          entityId: record.entityId,
          model: record.model,
          version: record.version,
        },
      },
      create: {
        entityType: record.entityType,
        entityId: record.entityId,
        model: record.model,
        version: record.version,
        dimension: record.dimension,
        contentHash: record.contentHash,
        vector: record.vector,
      },
      update: {
        dimension: record.dimension,
        contentHash: record.contentHash,
        vector: record.vector,
      },
    });
  }

  async get(
    entityType: EmbeddingEntityType,
    entityId: string,
    model: string,
    version: string,
  ): Promise<EmbeddingRecord | null> {
    const row = await this.prisma.embedding.findUnique({
      where: { entityType_entityId_model_version: { entityType, entityId, model, version } },
    });

    if (!row) return null;

    return {
      entityType: row.entityType as EmbeddingEntityType,
      entityId: row.entityId,
      model: row.model,
      version: row.version,
      dimension: row.dimension,
      contentHash: row.contentHash,
      vector: row.vector,
    };
  }

  async delete(entityType: EmbeddingEntityType, entityId: string): Promise<void> {
    await this.prisma.embedding.deleteMany({ where: { entityType, entityId } });
  }

  async findSimilar(
    entityType: EmbeddingEntityType,
    vector: number[],
    options: FindSimilarOptions,
  ): Promise<SimilarityMatch[]> {
    const rows = await this.prisma.embedding.findMany({
      where: {
        entityType,
        ...(options.allowedIds ? { entityId: { in: options.allowedIds } } : {}),
      },
      select: { entityId: true, vector: true },
      take: MAX_SEMANTIC_SCAN,
    });

    return rows
      .map((row) => ({
        entityId: row.entityId,
        score: cosineToSemanticScore(cosineSimilarity(vector, row.vector)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit);
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
