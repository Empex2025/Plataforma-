import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { AI_CONFIG, EMBEDDING_PROVIDER, VECTOR_STORE, EMBEDDING_REPRESENTATION_VERSION, EMBEDDING_VERSION } from '../ai.constants.js';
import type { AiConfig, EmbeddingEntityType } from '../ai.types.js';
import type { EmbeddingProvider } from '../providers/embedding-provider.interface.js';
import type { VectorStore } from '../vector-store/vector-store.interface.js';
import { EmbeddingDimensionError } from '../ai.errors.js';
import { computeContentHash } from '../embedding/content-hash.js';
import {
  buildOfferRepresentation,
  buildProductRepresentation,
  buildStoreRepresentation,
} from '../embedding/text-representation.js';

export type EmbeddingStatus = 'stored' | 'skipped' | 'disabled' | 'missing';

export interface EmbeddingOutcome {
  entityType: EmbeddingEntityType;
  entityId: string;
  status: EmbeddingStatus;
}

/**
 * Orchestrates embedding generation and storage.
 *
 * Design rules:
 *  - Never called synchronously from a CRUD request. Only the embedding worker
 *    (and the semantic retrieval path for query embeddings) use it.
 *  - The configured dimension is authoritative. Any provider vector whose
 *    length does not match is rejected, which keeps the deterministic fallback
 *    in charge.
 *  - When AI is disabled or misconfigured the service degrades to a no-op
 *    instead of throwing.
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(AI_CONFIG) private readonly config: AiConfig | null,
    @Optional() @Inject(EMBEDDING_PROVIDER) private readonly provider: EmbeddingProvider | null,
    @Optional() @Inject(VECTOR_STORE) private readonly vectorStore: VectorStore | null,
  ) {}

  get enabled(): boolean {
    return Boolean(this.config?.enabled && this.provider && this.vectorStore);
  }

  get model(): string {
    return this.provider?.model ?? this.config?.model ?? 'unknown';
  }

  /**
   * Generates and stores embeddings for a batch of entities of a single type.
   * Best-effort: individual failures are logged and skipped.
   */
  async embedEntities(entityType: EmbeddingEntityType, entityIds: string[]): Promise<EmbeddingOutcome[]> {
    if (!this.enabled || !this.provider || !this.vectorStore) {
      return entityIds.map((entityId) => ({ entityType, entityId, status: 'disabled' as const }));
    }

    const outcomes: EmbeddingOutcome[] = [];

    for (const entityId of entityIds) {
      try {
        outcomes.push(await this.embedEntity(entityType, entityId));
      } catch (error) {
        this.logger.warn(
          `Failed to embed ${entityType} ${entityId}: ${(error as Error).message}`,
        );
        outcomes.push({ entityType, entityId, status: 'skipped' });
      }
    }

    return outcomes;
  }

  async embedEntity(entityType: EmbeddingEntityType, entityId: string): Promise<EmbeddingOutcome> {
    if (!this.enabled || !this.provider || !this.vectorStore) {
      return { entityType, entityId, status: 'disabled' };
    }

    const representation = await this.loadRepresentation(entityType, entityId);
    if (!representation) {
      await this.vectorStore.delete(entityType, entityId).catch(() => undefined);
      return { entityType, entityId, status: 'missing' };
    }

    const { text, contentHash } = representation;
    const existing = await this.vectorStore.get(entityType, entityId, this.provider.model, EMBEDDING_VERSION);

    if (
      existing &&
      existing.contentHash === contentHash &&
      existing.model === this.provider.model &&
      existing.version === EMBEDDING_VERSION &&
      existing.dimension === this.config?.dimension
    ) {
      return { entityType, entityId, status: 'skipped' };
    }

    const vector = await this.generateVector(text);

    await this.vectorStore.upsert({
      entityType,
      entityId,
      model: this.provider.model,
      version: EMBEDDING_VERSION,
      dimension: vector.length,
      contentHash,
      vector,
    });

    return { entityType, entityId, status: 'stored' };
  }

  /**
   * Returns an embedding for free text (e.g. a user search query) or null when
   * AI is unavailable. Never throws: callers fall back to deterministic mode.
   */
  async embedQuery(text: string): Promise<number[] | null> {
    if (!this.enabled || !this.provider) return null;
    if (!text || text.trim().length === 0) return null;

    try {
      return await this.generateVector(text.trim());
    } catch (error) {
      this.logger.warn(`Query embedding failed: ${(error as Error).message}`);
      return null;
    }
  }

  private async generateVector(text: string): Promise<number[]> {
    if (!this.provider) {
      throw new Error('Embedding provider is not configured');
    }

    const vector = await this.provider.generateEmbedding(text);
    return this.assertDimension(vector);
  }

  /**
   * Guards against provider/config dimension mismatch. A rejected vector means
   * the entity keeps its previous embedding (or stays without one) and the
   * deterministic ranking remains in charge.
   */
  private assertDimension(vector: unknown): number[] {
    const expected = this.config?.dimension;

    if (!Array.isArray(vector) || vector.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
      throw new Error('Embedding provider returned an invalid vector');
    }

    if (typeof expected === 'number' && vector.length !== expected) {
      throw new EmbeddingDimensionError(expected, vector.length);
    }

    return vector as number[];
  }

  private async loadRepresentation(
    entityType: EmbeddingEntityType,
    entityId: string,
  ): Promise<{ text: string; contentHash: string } | null> {
    const text = await this.buildText(entityType, entityId);
    if (text === null) return null;
    return { text, contentHash: computeContentHash(text, EMBEDDING_REPRESENTATION_VERSION) };
  }

  private async buildText(entityType: EmbeddingEntityType, entityId: string): Promise<string | null> {
    switch (entityType) {
      case 'product':
        return this.buildProductText(entityId);
      case 'store':
        return this.buildStoreText(entityId);
      case 'offer':
        return this.buildOfferText(entityId);
      default:
        return null;
    }
  }

  private async buildProductText(productId: string): Promise<string | null> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null, status: 'ACTIVE' },
      select: {
        name: true,
        description: true,
        brand: { select: { name: true } },
        categories: { select: { category: { select: { name: true } } } },
        tags: { select: { tag: { select: { name: true } } } },
      },
    });

    if (!product) return null;

    return buildProductRepresentation({
      name: product.name,
      description: product.description,
      brandName: product.brand?.name ?? null,
      categoryNames: product.categories.map((c) => c.category.name),
      tagNames: product.tags.map((t) => t.tag.name),
    });
  }

  private async buildStoreText(storeId: string): Promise<string | null> {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, deletedAt: null, status: 'ACTIVE' },
      select: {
        id: true,
        companyId: true,
        name: true,
        description: true,
        city: true,
        state: true,
      },
    });

    if (!store) return null;

    const [products, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: { companyId: store.companyId, deletedAt: null, status: 'ACTIVE' },
        select: { name: true },
        take: 20,
      }),
      this.prisma.productCategory.findMany({
        where: { product: { companyId: store.companyId, deletedAt: null } },
        select: { category: { select: { name: true } } },
        take: 20,
      }),
    ]);

    return buildStoreRepresentation({
      name: store.name,
      description: store.description,
      city: store.city,
      state: store.state,
      productNames: products.map((p) => p.name),
      categoryNames: [...new Set(categories.map((c) => c.category.name))],
    });
  }

  private async buildOfferText(offerId: string): Promise<string | null> {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      select: {
        title: true,
        description: true,
        discountType: true,
        discountValue: true,
        products: {
          select: {
            product: {
              select: {
                name: true,
                categories: { select: { category: { select: { name: true } } } },
              },
            },
          },
        },
      },
    });

    if (!offer) return null;

    const productNames = offer.products.map((p) => p.product.name);
    const categoryNames = [
      ...new Set(offer.products.flatMap((p) => p.product.categories.map((c) => c.category.name))),
    ];

    return buildOfferRepresentation({
      title: offer.title,
      description: offer.description,
      productNames,
      categoryNames,
      discountLabel: offer.discountType === 'PERCENTAGE' ? `Desconto de ${offer.discountValue}%` : null,
    });
  }
}
