import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { PublicComparisonService } from './public-comparison.service.js';
import type { PublicProductsService } from './public-products.service.js';

const company = { id: 'c1', name: 'Company', slug: 'company' };
const product = {
  id: 'p1',
  companyId: 'c1',
  name: 'Arroz 5kg',
  slug: 'arroz-5kg',
  description: null,
  imageUrl: null,
  brand: null,
  categories: [],
};

function availabilityRow(overrides: Record<string, unknown> = {}) {
  return {
    store_id: 's1',
    store_name: 'Store 1',
    store_slug: 'store-1',
    store_status: 'ACTIVE',
    city: 'Fortaleza',
    state: 'CE',
    neighborhood: 'Centro',
    lat: -3.7,
    lng: -38.5,
    price: 10.5,
    price_type: 'REGULAR',
    has_stock: true,
    offers: [],
    distance: 1000,
    ...overrides,
  };
}

describe('PublicComparisonService', () => {
  let service: PublicComparisonService;
  let prisma: { $queryRaw: jest.Mock };
  let publicProductsService: { resolveContext: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = { $queryRaw: jest.fn() };
    publicProductsService = {
      resolveContext: jest.fn().mockResolvedValue({ company, product }),
    };
    service = new PublicComparisonService(
      prisma as never,
      publicProductsService as unknown as PublicProductsService,
    );
  });

  it('compares the same product across stores and computes lowest price', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      availabilityRow({ store_id: 's1', price: 12, distance: 2000 }),
      availabilityRow({ store_id: 's2', store_name: 'Store 2', price: 8, distance: 500 }),
    ]);

    const result = await service.compare('company', 'arroz-5kg', {});

    expect(result.product.id).toBe('p1');
    expect(result.stores).toHaveLength(2);
    expect(result.lowestPrice).toBe(8);
    expect(result.nearestStore).toBeNull();
  });

  it('returns nearest ACTIVE store when coordinates are provided', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      availabilityRow({ store_id: 's1', distance: 2000 }),
      availabilityRow({ store_id: 's2', store_name: 'Store 2', distance: 500 }),
    ]);

    const result = await service.compare('company', 'arroz-5kg', {
      lat: -3.7,
      lng: -38.5,
    });

    expect(result.stores[0].distance).toBe(2000);
    expect(result.nearestStore?.storeId).toBe('s2');
    expect(result.nearestStore?.distance).toBe(500);
  });

  it('excludes CLOSED_TEMPORARY stores from lowest price and nearest store', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      availabilityRow({ store_id: 's1', price: 10, distance: 2000 }),
      availabilityRow({
        store_id: 's2',
        store_name: 'Closed',
        store_status: 'CLOSED_TEMPORARY',
        price: 3,
        distance: 100,
      }),
    ]);

    const result = await service.compare('company', 'arroz-5kg', {
      lat: -3.7,
      lng: -38.5,
    });

    expect(result.lowestPrice).toBe(10);
    expect(result.nearestStore?.storeId).toBe('s1');
    const closed = result.stores.find((s) => s.storeId === 's2');
    expect(closed?.available).toBe(false);
  });

  it('does not expose distance when no coordinates are provided', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      availabilityRow({ distance: null }),
    ]);

    const result = await service.compare('company', 'arroz-5kg', {});

    expect(result.stores[0].distance).toBeNull();
    expect(result.nearestStore).toBeNull();
  });

  it('propagates 404 when the product is not public', async () => {
    publicProductsService.resolveContext.mockRejectedValue(
      new NotFoundException('Product not found'),
    );

    await expect(
      service.compare('company', 'missing', {}),
    ).rejects.toThrow(NotFoundException);
  });
});
