import { jest } from '@jest/globals';
import { SearchService } from './search.service.js';
import type { ISearchProvider } from './providers/search-provider.interface.js';

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

const mockPrismaService = {};

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SearchService(mockPrismaService as never);
  });

  describe('searchProducts', () => {
    it('returns empty result when no provider configured', async () => {
      const result = await service.searchProducts({
        term: 'test',
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({
        hits: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
    });

    it('delegates to provider when configured', async () => {
      service.setProvider(mockProvider);

      await service.searchProducts({ term: 'test', page: 1, limit: 20 });

      expect(mockProvider.searchProducts).toHaveBeenCalled();
    });

    it('calls provider.searchProducts with correct query', async () => {
      service.setProvider(mockProvider);
      const query = { term: 'laptop', page: 2, limit: 10 };

      await service.searchProducts(query);

      expect(mockProvider.searchProducts).toHaveBeenCalledWith(query);
    });
  });

  describe('searchStores', () => {
    it('returns empty result when no provider configured', async () => {
      const result = await service.searchStores({
        term: 'test',
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({
        hits: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
    });

    it('delegates to provider when configured', async () => {
      service.setProvider(mockProvider);

      await service.searchStores({ term: 'test', page: 1, limit: 20 });

      expect(mockProvider.searchStores).toHaveBeenCalled();
    });
  });

  describe('autocomplete', () => {
    it('returns empty when no provider', async () => {
      const result = await service.autocomplete('test');

      expect(result).toEqual([]);
    });

    it('delegates to provider', async () => {
      service.setProvider(mockProvider);

      await service.autocomplete('test', 'product', 5);

      expect(mockProvider.autocomplete).toHaveBeenCalledWith('test', 'product', 5);
    });
  });

  describe('setProvider', () => {
    it('registers provider', () => {
      service.setProvider(mockProvider);

      // After setting provider, search should delegate
      service.searchProducts({ term: 'test', page: 1, limit: 20 });
      expect(mockProvider.searchProducts).toHaveBeenCalled();
    });
  });
});
