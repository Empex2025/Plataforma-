import { jest } from '@jest/globals';
import { SemanticRetrievalService } from './semantic-retrieval.service.js';
import type { AiConfig } from '@/modules/ai/ai.types.js';

function makeConfig(enabled = true): AiConfig {
  return {
    enabled,
    provider: 'local',
    model: 'local-deterministic',
    dimension: 3,
    baseUrl: null,
    apiKey: null,
    vectorStore: 'array',
    timeoutMs: 1000,
  };
}

function makeProvider() {
  return { id: 'local', model: 'local-deterministic', dimension: 3, generateEmbedding: jest.fn(), generateEmbeddings: jest.fn() };
}

function makeVectorStore(matches: Array<{ entityId: string; score: number }> = []) {
  return {
    upsert: jest.fn(),
    get: jest.fn(async () => ({ vector: [1, 0, 0] })),
    delete: jest.fn(),
    findSimilar: jest.fn(async () => matches),
    isAvailable: jest.fn(async () => true),
  };
}

describe('SemanticRetrievalService', () => {
  it('is disabled when AI is off', () => {
    const service = new SemanticRetrievalService(makeConfig(false), makeProvider() as never, makeVectorStore() as never, null);
    expect(service.enabled).toBe(false);
  });

  it('is enabled when config, provider and store are present', () => {
    const service = new SemanticRetrievalService(makeConfig(), makeProvider() as never, makeVectorStore() as never, null);
    expect(service.enabled).toBe(true);
  });

  it('returns an empty result when disabled', async () => {
    const service = new SemanticRetrievalService(makeConfig(false), makeProvider() as never, makeVectorStore() as never, null);
    await expect(service.findSimilarIds('product', [1, 0, 0], 5)).resolves.toEqual([]);
    await expect(service.getEntityVector('product', 'id')).resolves.toBeNull();
  });

  it('excludes ids and honors the limit', async () => {
    const vectorStore = makeVectorStore([
      { entityId: 'self', score: 0.99 },
      { entityId: 'a', score: 0.8 },
      { entityId: 'b', score: 0.7 },
    ]);
    const service = new SemanticRetrievalService(makeConfig(), makeProvider() as never, vectorStore as never, null);

    const matches = await service.findSimilarIds('product', [1, 0, 0], 1, ['self']);

    expect(matches.map((m) => m.entityId)).not.toContain('self');
    expect(matches).toHaveLength(1);
  });

  it('maps semantic scores for a candidate set', async () => {
    const vectorStore = makeVectorStore([
      { entityId: 'a', score: 0.9 },
      { entityId: 'b', score: 0.2 },
    ]);
    const service = new SemanticRetrievalService(makeConfig(), makeProvider() as never, vectorStore as never, null);

    const scores = await service.scoreEntities('product', [1, 0, 0], ['a', 'b']);

    expect(scores.get('a')).toBeCloseTo(0.9, 6);
    expect(scores.get('b')).toBeCloseTo(0.2, 6);
    expect(vectorStore.findSimilar).toHaveBeenCalledWith('product', [1, 0, 0], {
      limit: 2,
      allowedIds: ['a', 'b'],
    });
  });
});
