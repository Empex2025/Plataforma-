import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { PublicProductsService } from './public-products.service.js';

const company = { id: 'c1', name: 'Company', slug: 'company' };

const product = {
  id: 'p1',
  companyId: 'c1',
  name: 'Arroz 5kg',
  slug: 'arroz-5kg',
  description: 'Type 1 rice',
  imageUrl: null,
  brand: { id: 'b1', name: 'Brand', slug: 'brand' },
  categories: [{ id: 'cat1', name: 'Food', slug: 'food', icon: null }],
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
    distance: 1234.56,
    ...overrides,
  };
}

describe('PublicProductsService', () => {
  let service: PublicProductsService;
  let prisma: {
    company: { findFirst: jest.Mock };
    product: { findFirst: jest.Mock };
    $queryRaw: jest.Mock;
  };

  const mockEventsService = { track: jest.fn().mockResolvedValue({ id: 'e1' }) };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      company: { findFirst: jest.fn() },
      product: { findFirst: jest.fn() },
      $queryRaw: jest.fn(),
    };
    mockEventsService.track.mockResolvedValue({ id: 'e1' });
    service = new PublicProductsService(prisma as never, mockEventsService as never);
  });

  it('returns public product with stores, offers and price range', async () => {
    prisma.company.findFirst.mockResolvedValue(company);
    prisma.product.findFirst.mockResolvedValue(product);
    prisma.$queryRaw
      .mockResolvedValueOnce([availabilityRow()])
      .mockResolvedValueOnce([
        {
          id: 'o1',
          title: 'Promo',
          description: null,
          discountType: 'PERCENTAGE',
          discountValue: 10,
          startsAt: null,
          endsAt: null,
        },
      ]);

    const result = await service.findBySlug('company', 'arroz-5kg', {});

    expect(result.id).toBe('p1');
    expect(result.name).toBe('Arroz 5kg');
    expect(result.brand).toEqual(product.brand);
    expect(result.categories).toHaveLength(1);
    expect(result.stores).toHaveLength(1);
    expect(result.stores[0].price).toBe(10.5);
    expect(result.stores[0].available).toBe(true);
    expect(result.lowestPrice).toBe(10.5);
    expect(result.highestPrice).toBe(10.5);
    expect(result.offers).toHaveLength(1);
    expect(result.offers?.[0].endsAt).toBeNull();
  });

  it('throws 404 when company is inactive or missing', async () => {
    prisma.company.findFirst.mockResolvedValue(null);

    await expect(service.findBySlug('company', 'arroz-5kg', {})).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws 404 when product is inactive or missing', async () => {
    prisma.company.findFirst.mockResolvedValue(company);
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(service.findBySlug('company', 'arroz-5kg', {})).rejects.toThrow(
      NotFoundException,
    );
  });

  it('marks CLOSED_TEMPORARY store as unavailable and excludes it from price range', async () => {
    prisma.company.findFirst.mockResolvedValue(company);
    prisma.product.findFirst.mockResolvedValue(product);
    prisma.$queryRaw
      .mockResolvedValueOnce([
        availabilityRow({ store_id: 's1', store_status: 'ACTIVE', price: 10 }),
        availabilityRow({
          store_id: 's2',
          store_name: 'Closed',
          store_slug: 'closed',
          store_status: 'CLOSED_TEMPORARY',
          price: 5,
          has_stock: true,
        }),
      ])
      .mockResolvedValueOnce([]);

    const result = await service.findBySlug('company', 'arroz-5kg', {});

    const closed = result.stores.find((s) => s.storeId === 's2');
    expect(closed?.available).toBe(false);
    expect(result.lowestPrice).toBe(10);
    expect(result.highestPrice).toBe(10);
  });

  it('returns null price when store has no current price', async () => {
    prisma.company.findFirst.mockResolvedValue(company);
    prisma.product.findFirst.mockResolvedValue(product);
    prisma.$queryRaw
      .mockResolvedValueOnce([availabilityRow({ price: null, price_type: null })])
      .mockResolvedValueOnce([]);

    const result = await service.findBySlug('company', 'arroz-5kg', {});

    expect(result.stores[0].price).toBeNull();
    expect(result.lowestPrice).toBeNull();
    expect(result.highestPrice).toBeNull();
  });

  it('marks store unavailable when there is no stock', async () => {
    prisma.company.findFirst.mockResolvedValue(company);
    prisma.product.findFirst.mockResolvedValue(product);
    prisma.$queryRaw
      .mockResolvedValueOnce([availabilityRow({ has_stock: false })])
      .mockResolvedValueOnce([]);

    const result = await service.findBySlug('company', 'arroz-5kg', {});

    expect(result.stores[0].available).toBe(false);
  });

  it('computes and rounds distance when consumer coordinates are provided', async () => {
    prisma.company.findFirst.mockResolvedValue(company);
    prisma.product.findFirst.mockResolvedValue(product);
    prisma.$queryRaw
      .mockResolvedValueOnce([availabilityRow({ distance: 1234.56 })])
      .mockResolvedValueOnce([]);

    const result = await service.findBySlug('company', 'arroz-5kg', {
      lat: -3.7,
      lng: -38.5,
    });

    expect(result.stores[0].distance).toBe(1235);
  });

  it('does not expose distance when no coordinates are provided', async () => {
    prisma.company.findFirst.mockResolvedValue(company);
    prisma.product.findFirst.mockResolvedValue(product);
    prisma.$queryRaw
      .mockResolvedValueOnce([availabilityRow({ distance: null })])
      .mockResolvedValueOnce([]);

    const result = await service.findBySlug('company', 'arroz-5kg', {});

    expect(result.stores[0].distance).toBeNull();
  });

  it('maps store-specific offers with store name', async () => {
    prisma.company.findFirst.mockResolvedValue(company);
    prisma.product.findFirst.mockResolvedValue(product);
    prisma.$queryRaw
      .mockResolvedValueOnce([
        availabilityRow({
          offers: [
            {
              id: 'o1',
              title: '10% off',
              description: 'desc',
              discountType: 'PERCENTAGE',
              discountValue: 10,
              startsAt: '2026-01-01T00:00:00.000Z',
              endsAt: null,
              storeId: 's1',
            },
          ],
        }),
      ])
      .mockResolvedValueOnce([]);

    const result = await service.findBySlug('company', 'arroz-5kg', {});

    expect(result.stores[0].offers).toHaveLength(1);
    expect(result.stores[0].offers?.[0].storeName).toBe('Store 1');
    expect(result.stores[0].offers?.[0].startsAt).toBeInstanceOf(Date);
    expect(result.stores[0].offers?.[0].endsAt).toBeNull();
  });
});
