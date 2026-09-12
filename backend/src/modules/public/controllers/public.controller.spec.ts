import { jest } from '@jest/globals';
import { PublicController } from './public.controller.js';
import type { PublicProductsService } from '../services/public-products.service.js';
import type { PublicStoresService } from '../services/public-stores.service.js';
import type { PublicComparisonService } from '../services/public-comparison.service.js';

const mockProductsService = {
  findBySlug: jest.fn().mockResolvedValue({ id: 'p1' }),
};

const mockStoresService = {
  findBySlug: jest.fn().mockResolvedValue({ id: 's1' }),
  listProducts: jest.fn().mockResolvedValue({ hits: [], total: 0 }),
  listCategories: jest.fn().mockResolvedValue({ categories: [] }),
};

const mockComparisonService = {
  compare: jest.fn().mockResolvedValue({ product: { id: 'p1' }, stores: [] }),
};

describe('PublicController', () => {
  let controller: PublicController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PublicController(
      mockProductsService as unknown as PublicProductsService,
      mockStoresService as unknown as PublicStoresService,
      mockComparisonService as unknown as PublicComparisonService,
    );
  });

  it('delegates getProduct to PublicProductsService', async () => {
    const query = { lat: -3.7, lng: -38.5 };

    const result = await controller.getProduct('company', 'arroz-5kg', query, { user: { sub: 'u1' } } as never);

    expect(mockProductsService.findBySlug).toHaveBeenCalledWith(
      'company',
      'arroz-5kg',
      query,
      'u1',
    );
    expect(result).toEqual({ id: 'p1' });
  });

  it('delegates compareProduct to PublicComparisonService', async () => {
    const query = { sort: 'price_asc' };

    await controller.compareProduct('company', 'arroz-5kg', query);

    expect(mockComparisonService.compare).toHaveBeenCalledWith(
      'company',
      'arroz-5kg',
      query,
    );
  });

  it('delegates getStore to PublicStoresService', async () => {
    await controller.getStore('company', 'store-1', { user: { sub: 'u1' } } as never);

    expect(mockStoresService.findBySlug).toHaveBeenCalledWith(
      'company',
      'store-1',
      'u1',
    );
  });

  it('delegates listStoreProducts to PublicStoresService', async () => {
    const query = { page: 1, limit: 10 };

    await controller.listStoreProducts('company', 'store-1', query);

    expect(mockStoresService.listProducts).toHaveBeenCalledWith(
      'company',
      'store-1',
      query,
    );
  });

  it('delegates listStoreCategories to PublicStoresService', async () => {
    await controller.listStoreCategories('company', 'store-1');

    expect(mockStoresService.listCategories).toHaveBeenCalledWith(
      'company',
      'store-1',
    );
  });
});
