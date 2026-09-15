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
    const vector = toVectorLiteral(record.vector);

    await this.prisma.$executeRaw`
      INSERT INTO embeddings (id, entity_type, entity_id, model, version, dimension, content_hash, vector, created_at, updated_at)
      VALUES (gen_random_uuid(), ${record.entityType}, ${record.entityId}, ${record.model}, ${record.version},
              ${record.dimension}, ${record.contentHash}, ${vector}::vector, NOW(), NOW())
      ON CONFLICT (entity_type, entity_id, model, version)
      DO UPDATE SET dimension = ${record.dimension}, content_hash = ${record.contentHash}, vector = ${vector}::vector, updated_at = NOW()
    `;
  }

  async get(): Promise<EmbeddingRecord | null> {
    return null;
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

    const rows = await this.prisma.$queryRaw<PgVectorRow[]>`
      SELECT entity_id, (vector <=> ${literal}::vector) AS distance
      FROM embeddings
      WHERE entity_type = ${entityType}
      ORDER BY vector <=> ${literal}::vector
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
