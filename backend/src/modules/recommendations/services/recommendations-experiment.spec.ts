import { jest } from '@jest/globals';
import { EventType } from '@/generated/prisma/enums.js';
import { RecommendationsService } from './recommendations.service.js';

function makePrisma() {
  return {
    product: {
      findMany: jest.fn(async () => [
        {
          id: 'p1',
          companyId: 'c1',
          name: 'Produto',
          slug: 'produto',
          imageUrl: null,
          ratingAverage: null,
          ratingCount: 0,
          createdAt: new Date(),
          brand: null,
          categories: [],
          tags: [],
          prices: [],
          inventory: [],
        },
      ]),
    },
    offer: { findMany: jest.fn(async () => []) },
    event: { findMany: jest.fn(async () => []) },
  };
}

function makeAiRanking() {
  return {
    enabled: true,
    rank: jest.fn(async (_type: string, items: unknown[]) => items),
    findSimilarEntityIds: jest.fn(async () => []),
  };
}

function makeEvents() {
  return { track: jest.fn(async () => ({})) };
}

describe('RecommendationsService x experiments', () => {
  it('CONTROL forces deterministic: AI ranking is skipped and an impression is tracked', async () => {
    const aiRanking = makeAiRanking();
    const eventsService = makeEvents();
    const strategyResolver = { resolve: jest.fn(async () => ({ strategy: 'deterministic' })) };
    const service = new RecommendationsService(
      makePrisma() as never,
      { getPopularityScore: jest.fn(async () => []) } as never,
      aiRanking as never,
      strategyResolver as never,
      eventsService as never,
    );

    await service.getProductRecommendations({}, 'user-1');

    expect(aiRanking.rank).not.toHaveBeenCalled();
    expect(eventsService.track).toHaveBeenCalledWith(
      expect.objectContaining({ type: EventType.RECOMMENDATION_IMPRESSION }),
      'user-1',
    );
  });

  it('TREATMENT keeps the hybrid path', async () => {
    const aiRanking = makeAiRanking();
    const eventsService = makeEvents();
    const strategyResolver = { resolve: jest.fn(async () => ({ strategy: 'hybrid' })) };
    const service = new RecommendationsService(
      makePrisma() as never,
      { getPopularityScore: jest.fn(async () => []) } as never,
      aiRanking as never,
      strategyResolver as never,
      eventsService as never,
    );

    await service.getProductRecommendations({}, 'user-1');

    expect(aiRanking.rank).toHaveBeenCalled();
    expect(eventsService.track).toHaveBeenCalled();
  });

  it('without an experiment the default behavior is preserved (no impression)', async () => {
    const aiRanking = makeAiRanking();
    const eventsService = makeEvents();
    const service = new RecommendationsService(
      makePrisma() as never,
      { getPopularityScore: jest.fn(async () => []) } as never,
      aiRanking as never,
      undefined,
      eventsService as never,
    );

    await service.getProductRecommendations({}, 'user-1');

    expect(aiRanking.rank).toHaveBeenCalled();
    expect(eventsService.track).not.toHaveBeenCalled();
  });

  it('falls back to deterministic items when experiment resolution fails', async () => {
    const aiRanking = makeAiRanking();
    const strategyResolver = { resolve: jest.fn(async () => { throw new Error('db down'); }) };
    const service = new RecommendationsService(
      makePrisma() as never,
      { getPopularityScore: jest.fn(async () => []) } as never,
      aiRanking as never,
      strategyResolver as never,
      makeEvents() as never,
    );

    const result = await service.getProductRecommendations({}, 'user-1');

    expect(result.items).toHaveLength(1);
  });
});
