import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import type { EmbeddingEntityType } from '../ai.types.js';
import { cosineToSemanticScore } from './cosine.js';
import type {
  EmbeddingRecord,
  FindSimilarOptions,
  SimilarityMatch,
  VectorStore,
} from './vector-store.interface.js';

interface PgVectorRow {
  entity_id: string;
  distance: number;
}

@Injectable()
export class PgVectorStore implements VectorStore {
  private readonly logger = new Logger(PgVectorStore.name);

  constructor(private readonly prisma: PrismaService) {}

  async isAvailable(): Promise<boolean> {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS exists
      `;
      return rows[0]?.exists === true;
    } catch (error) {
      this.logger.warn(`pgvector availability check failed: ${(error as Error).message}`);
      return false;
    }
  }

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
    const literal = toVectorLiteral(vector);
    const allowedIds =
      options.allowedIds && options.allowedIds.length > 0 ? options.allowedIds : null;

    const rows = await this.prisma.$queryRaw<PgVectorRow[]>`
      SELECT e.entity_id, (e.vector::vector <=> ${literal}::vector) AS distance
      FROM embeddings e
      WHERE e.entity_type = ${entityType}
        AND (${allowedIds}::uuid[] IS NULL OR e.entity_id = ANY(${allowedIds}::uuid[]))
      ORDER BY e.vector::vector <=> ${literal}::vector
      LIMIT ${options.limit}
    `;

    return rows
      .map((row) => ({
        entityId: row.entity_id,
        score: cosineToSemanticScore(1 - Number(row.distance)),
      }))
      .sort((a, b) => b.score - a.score);
  }
}

function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
