import { jest } from '@jest/globals';
import { SearchIndexQueue } from './search-index-queue.js';

const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-1' }),
};

describe('SearchIndexQueue', () => {
  let queue: SearchIndexQueue;

  beforeEach(() => {
    jest.clearAllMocks();
    queue = new SearchIndexQueue(mockQueue as never);
  });

  describe('indexProduct', () => {
    it('adds job to queue', async () => {
      await queue.indexProduct('product-1');

      expect(mockQueue.add).toHaveBeenCalledWith(
        'index-product',
        { productId: 'product-1' },
        expect.objectContaining({
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
        }),
      );
    });
  });

  describe('indexStore', () => {
    it('adds job to queue', async () => {
      await queue.indexStore('store-1');

      expect(mockQueue.add).toHaveBeenCalledWith(
        'index-store',
        { storeId: 'store-1' },
        expect.objectContaining({
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
        }),
      );
    });
  });

  describe('removeProduct', () => {
    it('adds job to queue', async () => {
      await queue.removeProduct('product-1');

      expect(mockQueue.add).toHaveBeenCalledWith(
        'delete-product',
        { productId: 'product-1' },
        expect.objectContaining({
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
        }),
      );
    });
  });

  describe('removeStore', () => {
    it('adds job to queue', async () => {
      await queue.removeStore('store-1');

      expect(mockQueue.add).toHaveBeenCalledWith(
        'delete-store',
        { storeId: 'store-1' },
        expect.objectContaining({
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
        }),
      );
    });
  });

  describe('reindexAllProducts', () => {
    it('adds job and returns id', async () => {
      mockQueue.add.mockResolvedValue({ id: 'reindex-job-1' });

      const jobId = await queue.reindexAllProducts();

      expect(mockQueue.add).toHaveBeenCalledWith(
        'reindex-all-products',
        {},
        expect.objectContaining({
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
        }),
      );
      expect(jobId).toBe('reindex-job-1');
    });
  });

  describe('reindexAllStores', () => {
    it('adds job and returns id', async () => {
      mockQueue.add.mockResolvedValue({ id: 'reindex-job-2' });

      const jobId = await queue.reindexAllStores();

      expect(mockQueue.add).toHaveBeenCalledWith(
        'reindex-all-stores',
        {},
        expect.objectContaining({
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
        }),
      );
      expect(jobId).toBe('reindex-job-2');
    });
  });
});
