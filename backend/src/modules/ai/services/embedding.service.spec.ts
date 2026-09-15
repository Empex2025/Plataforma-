import { jest } from '@jest/globals';
import { EmbeddingService } from './embedding.service.js';
import { EmbeddingDimensionError } from '../ai.errors.js';
import { computeContentHash } from '../embedding/content-hash.js';
import { buildProductRepresentation } from '../embedding/text-representation.js';
import type { AiConfig } from '../ai.types.js';

const PRODUCT_ID = '11111111-1111-1111-1111-111111111111';

function makeConfig(overrides: Partial<AiConfig> = {}): AiConfig {
  return {
    enabled: true,
    provider: 'local',
    model: 'local-deterministic',
    dimension: 3,
    baseUrl: null,
    apiKey: null,
    vectorStore: 'array',
    timeoutMs: 1000,
    ...overrides,
  };
}

function makeProvider(vector: number[] = [1, 0, 0]) {
  return {
    id: 'local',
    model: 'local-deterministic',
    dimension: vector.length,
    generateEmbedding: jest.fn(async () => vector),
    generateEmbeddings: jest.fn(async () => [vector]),
  };
}

function makeVectorStore() {
  return {
    upsert: jest.fn(async () => undefined),
    get: jest.fn(async () => null),
    delete: jest.fn(async () => undefined),
    findSimilar: jest.fn(async () => []),
    isAvailable: jest.fn(async () => true),
  };
}

function makePrisma(product: unknown = { name: 'Tênis Runner', description: 'Corrida', brand: null, categories: [], tags: [] }) {
  return {
    product: { findFirst: jest.fn(async () => product) },
    store: { findFirst: jest.fn(async () => null) },
    offer: { findUnique: jest.fn(async () => null) },
    productCategory: { findMany: jest.fn(async () => []) },
  };
}

describe('EmbeddingService', () => {
  it('reports disabled and does not call the provider when AI is off', async () => {
    const provider = makeProvider();
    const service = new EmbeddingService(
      makePrisma() as never,
      makeConfig({ enabled: false }),
      provider as never,
      makeVectorStore() as never,
    );

    const outcome = await service.embedEntity('product', PRODUCT_ID);

    expect(outcome.status).toBe('disabled');
    expect(provider.generateEmbedding).not.toHaveBeenCalled();
  });

  it('stores an embedding for an existing entity', async () => {
    const provider = makeProvider();
    const vectorStore = makeVectorStore();
    const service = new EmbeddingService(
      makePrisma() as never,
      makeConfig(),
      provider as never,
      vectorStore as never,
    );

    const outcome = await service.embedEntity('product', PRODUCT_ID);

    expect(outcome.status).toBe('stored');
    expect(vectorStore.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: PRODUCT_ID, dimension: 3, vector: [1, 0, 0] }),
    );
  });

  it('skips regeneration when the content hash is unchanged', async () => {
    const provider = makeProvider();
    const vectorStore = makeVectorStore();
    const text = buildProductRepresentation({
      name: 'Tênis Runner',
      description: 'Corrida',
      brandName: null,
      categoryNames: [],
      tagNames: [],
    });
    vectorStore.get.mockResolvedValue({
      entityType: 'product',
      entityId: PRODUCT_ID,
      model: 'local-deterministic',
      version: 'v1',
      dimension: 3,
      contentHash: computeContentHash(text, 'v1'),
      vector: [1, 0, 0],
    });

    const service = new EmbeddingService(
      makePrisma() as never,
      makeConfig(),
      provider as never,
      vectorStore as never,
    );

    const outcome = await service.embedEntity('product', PRODUCT_ID);

    expect(outcome.status).toBe('skipped');
    expect(provider.generateEmbedding).not.toHaveBeenCalled();
    expect(vectorStore.upsert).not.toHaveBeenCalled();
  });

  it('regenerates when the content hash changed', async () => {
    const provider = makeProvider();
    const vectorStore = makeVectorStore();
    vectorStore.get.mockResolvedValue({
      entityType: 'product',
      entityId: PRODUCT_ID,
      model: 'local-deterministic',
      version: 'v1',
      dimension: 3,
      contentHash: 'outdated-hash',
      vector: [1, 0, 0],
    });

    const service = new EmbeddingService(
      makePrisma() as never,
      makeConfig(),
      provider as never,
      vectorStore as never,
    );

    const outcome = await service.embedEntity('product', PRODUCT_ID);

    expect(outcome.status).toBe('stored');
    expect(vectorStore.upsert).toHaveBeenCalled();
  });

  it('rejects a provider vector whose dimension does not match the configuration', async () => {
    const provider = makeProvider([1, 0]);
    const vectorStore = makeVectorStore();
    const service = new EmbeddingService(
      makePrisma() as never,
      makeConfig({ dimension: 3 }),
      provider as never,
      vectorStore as never,
    );

    await expect(service.embedEntity('product', PRODUCT_ID)).rejects.toBeInstanceOf(EmbeddingDimensionError);
    expect(vectorStore.upsert).not.toHaveBeenCalled();
  });

  it('removes the embedding when the entity no longer exists', async () => {
    const vectorStore = makeVectorStore();
    const service = new EmbeddingService(
      makePrisma(null) as never,
      makeConfig(),
      makeProvider() as never,
      vectorStore as never,
    );

    const outcome = await service.embedEntity('product', PRODUCT_ID);

    expect(outcome.status).toBe('missing');
    expect(vectorStore.delete).toHaveBeenCalledWith('product', PRODUCT_ID);
  });

  it('returns null for query embeddings when AI is disabled', async () => {
    const service = new EmbeddingService(
      makePrisma() as never,
      makeConfig({ enabled: false }),
      makeProvider() as never,
      makeVectorStore() as never,
    );

    await expect(service.embedQuery('tênis')).resolves.toBeNull();
  });

  it('returns null (never throws) when the provider fails', async () => {
    const provider = makeProvider();
    provider.generateEmbedding.mockRejectedValue(new Error('provider down'));
    const service = new EmbeddingService(
      makePrisma() as never,
      makeConfig(),
      provider as never,
      makeVectorStore() as never,
    );

    await expect(service.embedQuery('tênis')).resolves.toBeNull();
  });

  it('embeds a batch and reports per-item outcomes', async () => {
    const vectorStore = makeVectorStore();
    const service = new EmbeddingService(
      makePrisma() as never,
      makeConfig(),
      makeProvider() as never,
      vectorStore as never,
    );

    const outcomes = await service.embedEntities('product', [PRODUCT_ID, PRODUCT_ID]);

    expect(outcomes).toHaveLength(2);
    expect(outcomes.every((o) => o.status === 'stored')).toBe(true);
  });
});
