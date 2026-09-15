import { jest } from '@jest/globals';
import { SearchService } from './search.service.js';
import type { ISearchProvider } from '../providers/search-provider.interface.js';

const mockProvider: ISearchProvider = {
  searchProducts: jest.fn().mockResolvedValue({ hits: [], total: 0, page: 1, limit: 20, totalPages: 0 }),
  searchStores: jest.fn().mockResolvedValue({ hits: [], total: 0, page: 1, limit: 20, totalPages: 0 }),
  autocomplete: jest.fn().mockResolvedValue([]),
  indexProduct: jest.fn(),
  indexStore: jest.fn(),
  deleteProduct: jest.fn(),
  deleteStore: jest.fn(),
  reindexProducts: jest.fn(),
  reindexStores: jest.fn(),
  initialize: jest.fn(),
  shutdown: jest.fn(),
};

const mockPrismaService = { $queryRaw: jest.fn() };

const mockEventsService = {
  track: jest.fn().mockResolvedValue({ id: 'event-1' }),
};

const mockConfigService = {
  get: jest.fn((_key: string, fallback?: string) => fallback),
};

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEventsService.track.mockResolvedValue({ id: 'event-1' });
    service = new SearchService(
      mockPrismaService as never,
      mockProvider,
      mockEventsService as never,
      mockConfigService as never,
    );
  });

  describe('searchProducts', () => {
    it('delegates to the injected provider', async () => {
      const query = { term: 'laptop', page: 2, limit: 10 };

      await service.searchProducts(query);

      expect(mockProvider.searchProducts).toHaveBeenCalledWith(query);
    });

    it('returns the provider result', async () => {
      const providerResult = { hits: [{ id: 'p1' }], total: 1, page: 1, limit: 20, totalPages: 1 };
      (mockProvider.searchProducts as jest.Mock).mockResolvedValueOnce(providerResult);

      const result = await service.searchProducts({ term: 'laptop', page: 1, limit: 20 });

      expect(result).toBe(providerResult);
    });

    it('records a SEARCH event for the authenticated user', async () => {
      await service.searchProducts({ term: 'laptop', page: 1, limit: 20 }, 'user-1');

      expect(mockEventsService.track).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SEARCH' }),
        'user-1',
      );
    });

    it('does not fail the search when event tracking fails', async () => {
      mockEventsService.track.mockRejectedValueOnce(new Error('db down'));

      await expect(
        service.searchProducts({ term: 'laptop', page: 1, limit: 20 }, 'user-1'),
      ).resolves.toBeDefined();
    });

    it('returns a controlled 503 when the provider is unavailable', async () => {
      (mockProvider.searchProducts as jest.Mock).mockRejectedValueOnce(new Error('meili down'));

      await expect(
        service.searchProducts({ term: 'laptop', page: 1, limit: 20 }),
      ).rejects.toMatchObject({ status: 503 });
    });
  });

  describe('searchStores', () => {
    it('delegates to the injected provider', async () => {
      await service.searchStores({ term: 'mercado', page: 1, limit: 20 });

      expect(mockProvider.searchStores).toHaveBeenCalledWith({ term: 'mercado', page: 1, limit: 20 });
    });
  });

  describe('autocomplete', () => {
    it('delegates to the provider with default limit', async () => {
      await service.autocomplete('arr');

      expect(mockProvider.autocomplete).toHaveBeenCalledWith('arr', null, 5);
    });

    it('passes type and limit through', async () => {
      await service.autocomplete('arr', 'product', 10);

      expect(mockProvider.autocomplete).toHaveBeenCalledWith('arr', 'product', 10);
    });
  });
});
