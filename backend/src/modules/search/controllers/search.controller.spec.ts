import { jest } from '@jest/globals';
import { SearchController } from './search.controller.js';
import type { SearchService } from '../services/search.service.js';
import type { SearchIndexQueue } from '../queues/search-index-queue.js';

const mockSearchService = {
  searchProducts: jest.fn().mockResolvedValue({ hits: [], total: 0, page: 1, limit: 20, totalPages: 0 }),
  searchStores: jest.fn().mockResolvedValue({ hits: [], total: 0, page: 1, limit: 20, totalPages: 0 }),
  autocomplete: jest.fn().mockResolvedValue([]),
};

const mockSearchIndexQueue = {
  reindexAllProducts: jest.fn().mockResolvedValue('job-1'),
  reindexAllStores: jest.fn().mockResolvedValue('job-2'),
};

describe('SearchController', () => {
  let controller: SearchController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SearchController(
      mockSearchService as unknown as SearchService,
      mockSearchIndexQueue as unknown as SearchIndexQueue,
    );
  });

  describe('searchProducts', () => {
    it('calls service with correct params', async () => {
      const dto = {
        q: 'laptop',
        page: 1,
        limit: 20,
        categoryId: 'cat-1',
        brandId: 'brand-1',
      };

      await controller.searchProducts(dto as never, { user: { sub: 'u1' } } as never);

      expect(mockSearchService.searchProducts).toHaveBeenCalledWith({
        term: 'laptop',
        categoryId: 'cat-1',
        brandId: 'brand-1',
        storeId: undefined,
        city: undefined,
        state: undefined,
        inStock: undefined,
        minPrice: undefined,
        maxPrice: undefined,
        lat: undefined,
        lng: undefined,
        radius: undefined,
        sort: undefined,
        page: 1,
        limit: 20,
      }, 'u1');
    });
  });

  describe('searchStores', () => {
    it('calls service with correct params', async () => {
      const dto = {
        q: 'pharmacy',
        page: 1,
        limit: 20,
        city: 'São Paulo',
        state: 'SP',
      };

      await controller.searchStores(dto as never, { user: { sub: 'u1' } } as never);

      expect(mockSearchService.searchStores).toHaveBeenCalledWith({
        term: 'pharmacy',
        city: 'São Paulo',
        state: 'SP',
        category: undefined,
        lat: undefined,
        lng: undefined,
        radius: undefined,
        sort: undefined,
        page: 1,
        limit: 20,
      }, 'u1');
    });
  });

  describe('autocomplete', () => {
    it('calls service with correct params', async () => {
      const dto = { q: 'lap', type: 'product', limit: 5 };

      await controller.autocomplete(dto as never);

      expect(mockSearchService.autocomplete).toHaveBeenCalledWith('lap', 'product', 5);
    });
  });

  describe('reindex', () => {
    it('triggers reindex for products', async () => {
      const result = await controller.reindex('products');

      expect(mockSearchIndexQueue.reindexAllProducts).toHaveBeenCalled();
      expect(mockSearchIndexQueue.reindexAllStores).not.toHaveBeenCalled();
      expect(result).toEqual({ jobIds: ['job-1'] });
    });

    it('triggers reindex for stores', async () => {
      const result = await controller.reindex('stores');

      expect(mockSearchIndexQueue.reindexAllStores).toHaveBeenCalled();
      expect(mockSearchIndexQueue.reindexAllProducts).not.toHaveBeenCalled();
      expect(result).toEqual({ jobIds: ['job-2'] });
    });

    it('triggers reindex for all', async () => {
      const result = await controller.reindex('all');

      expect(mockSearchIndexQueue.reindexAllProducts).toHaveBeenCalled();
      expect(mockSearchIndexQueue.reindexAllStores).toHaveBeenCalled();
      expect(result).toEqual({ jobIds: ['job-1', 'job-2'] });
    });
  });
});
