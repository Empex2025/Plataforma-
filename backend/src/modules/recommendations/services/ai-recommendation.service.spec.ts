import { jest } from '@jest/globals';
import { AiRecommendationService, type RankableItem } from './ai-recommendation.service.js';
import { RecommendationReasonCode } from '../recommendations.constants.js';

function makeItem(id: string, score: number): RankableItem {
  return {
    id,
    type: 'product',
    name: `Item ${id}`,
    slug: id,
    companyId: 'company-1',
    reasons: [],
    _score: score,
  };
}

function makeSemantic(enabled: boolean, vector: number[] | null = [1, 0, 0]) {
  return {
    enabled,
    embedText: jest.fn(async () => vector),
    getEntityVector: jest.fn(async () => vector),
    findSimilarIds: jest.fn(async () => []),
    scoreEntities: jest.fn(async () => new Map<string, number>()),
  };
}

function makeEmbeddingService(vector: number[] | null = [1, 0, 0]) {
  return { embedQuery: jest.fn(async () => vector) };
}

describe('AiRecommendationService', () => {
  it('returns items untouched when disabled', async () => {
    const semantic = makeSemantic(false);
    const service = new AiRecommendationService(semantic as never, makeEmbeddingService() as never);

    const items = [makeItem('a', 0.5)];
    const result = await service.rank('product', items, { searchQuery: 'tênis' });

    expect(result).toBe(items);
    expect(semantic.scoreEntities).not.toHaveBeenCalled();
  });

  it('applies hybrid scoring and adds the semantic reason', async () => {
    const semantic = makeSemantic(true);
    semantic.scoreEntities.mockResolvedValue(new Map([['a', 0.9], ['b', 0.1]]));
    const service = new AiRecommendationService(semantic as never, makeEmbeddingService() as never);

    const items = [makeItem('a', 0.4), makeItem('b', 0.6)];
    const result = await service.rank('product', items, { searchQuery: 'tênis de corrida' });

    expect(result[0]._score).toBeGreaterThan(0);
    const boosted = result.find((item) => item.id === 'a')!;
    expect(boosted.reasons.some((r) => r.code === RecommendationReasonCode.SEMANTICALLY_RELEVANT)).toBe(true);

    const low = result.find((item) => item.id === 'b')!;
    expect(low.reasons.some((r) => r.code === RecommendationReasonCode.SEMANTICALLY_RELEVANT)).toBe(false);
  });

  it('does not expose internal scores in reasons', async () => {
    const semantic = makeSemantic(true);
    semantic.scoreEntities.mockResolvedValue(new Map([['a', 0.9]]));
    const service = new AiRecommendationService(semantic as never, makeEmbeddingService() as never);

    const result = await service.rank('product', [makeItem('a', 0.4)], { searchQuery: 'x' });

    for (const reason of result[0].reasons) {
      expect(Object.keys(reason).sort()).toEqual(['code', 'label']);
    }
  });

  it('uses behavioral signals even without a semantic query', async () => {
    const semantic = makeSemantic(true);
    const service = new AiRecommendationService(semantic as never, makeEmbeddingService(null) as never);

    const items = [makeItem('a', 0.2), makeItem('b', 0.2)];
    const result = await service.rank('product', items, {
      behavioralById: new Map([['a', 1]]),
    });

    const a = result.find((item) => item.id === 'a')!;
    const b = result.find((item) => item.id === 'b')!;
    expect(a._score).toBeGreaterThan(b._score);
  });

  it('findSimilarEntityIds returns [] on failure', async () => {
    const semantic = makeSemantic(true);
    semantic.getEntityVector.mockRejectedValue(new Error('store down'));
    const service = new AiRecommendationService(semantic as never, makeEmbeddingService() as never);

    await expect(service.findSimilarEntityIds('product', 'p1', 10)).resolves.toEqual([]);
  });
});
