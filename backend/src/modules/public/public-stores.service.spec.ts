import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { PublicStoresService } from './public-stores.service.js';

const company = { id: 'c1', name: 'Company', slug: 'company' };

const storeRow = {
  id: 's1',
  name: 'Store 1',
  slug: 'store-1',
  description: 'Best store',
  phone: '85999999999',
  whatsapp: '85999999999',
  email: 'store@example.com',
  address: 'Rua A',
  address_num: '10',
  complement: null,
  neighborhood: 'Centro',
  city: 'Fortaleza',
  state: 'CE',
  zip_code: '60000-000',
  country: 'BR',
  lat: -3.7,
  lng: -38.5,
  status: 'ACTIVE',
};

function productRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    name: 'Arroz',
    slug: 'arroz',
    description: null,
    image_url: null,
    brand_name: 'Brand',
    price: 10.5,
    price_type: 'REGULAR',
    has_stock: true,
    categories: [{ id: 'c1', name: 'Food', slug: 'food' }],
    updated_at: new Date(),
    total_count: 1,
    ...overrides,
  };
}

describe('PublicStoresService', () => {
  let service: PublicStoresService;
  let prisma: {
    company: { findFirst: jest.Mock };
    $queryRaw: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      company: { findFirst: jest.fn() },
      $queryRaw: jest.fn(),
    };
    service = new PublicStoresService(prisma as never);
  });

  describe('findBySlug', () => {
    it('returns public store with product and offer counts', async () => {
      prisma.company.findFirst.mockResolvedValue(company);
      prisma.$queryRaw
        .mockResolvedValueOnce([storeRow])
        .mockResolvedValueOnce([{ count: 7 }])
        .mockResolvedValueOnce([{ count: 3 }]);

      const result = await service.findBySlug('company', 'store-1');

      expect(result.id).toBe('s1');
      expect(result.name).toBe('Store 1');
      expect(result.phone).toBe('85999999999');
      expect(result.productCount).toBe(7);
      expect(result.activeOfferCount).toBe(3);
      expect(result.companyName).toBe('Company');
      expect(result.lat).toBe(-3.7);
    });

    it('throws 404 when company is inactive or missing', async () => {
      prisma.company.findFirst.mockResolvedValue(null);

      await expect(service.findBySlug('company', 'store-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 404 when store is inactive, deleted or missing', async () => {
      prisma.company.findFirst.mockResolvedValue(company);
      prisma.$queryRaw.mockResolvedValueOnce([]);

      await expect(service.findBySlug('company', 'store-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listProducts', () => {
    it('returns paginated public products with availability', async () => {
      prisma.company.findFirst.mockResolvedValue(company);
      prisma.$queryRaw
        .mockResolvedValueOnce([storeRow])
        .mockResolvedValueOnce([productRow()]);

      const result = await service.listProducts('company', 'store-1', {});

      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].price).toBe(10.5);
      expect(result.hits[0].available).toBe(true);
      expect(result.hits[0].brandName).toBe('Brand');
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('computes pagination metadata from total count', async () => {
      prisma.company.findFirst.mockResolvedValue(company);
      prisma.$queryRaw
        .mockResolvedValueOnce([storeRow])
        .mockResolvedValueOnce([productRow({ total_count: 5 })]);

      const result = await service.listProducts('company', 'store-1', {
        page: 2,
        limit: 2,
      });

      expect(result.total).toBe(5);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(2);
      expect(result.totalPages).toBe(3);
    });

    it('returns zero total when no products match', async () => {
      prisma.company.findFirst.mockResolvedValue(company);
      prisma.$queryRaw
        .mockResolvedValueOnce([storeRow])
        .mockResolvedValueOnce([]);

      const result = await service.listProducts('company', 'store-1', {});

      expect(result.hits).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('marks products unavailable when store is CLOSED_TEMPORARY', async () => {
      prisma.company.findFirst.mockResolvedValue(company);
      prisma.$queryRaw
        .mockResolvedValueOnce([{ ...storeRow, status: 'CLOSED_TEMPORARY' }])
        .mockResolvedValueOnce([productRow()]);

      const result = await service.listProducts('company', 'store-1', {});

      expect(result.hits[0].available).toBe(false);
    });

    it('throws 404 when store is not public', async () => {
      prisma.company.findFirst.mockResolvedValue(company);
      prisma.$queryRaw.mockResolvedValueOnce([]);

      await expect(
        service.listProducts('company', 'store-1', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listCategories', () => {
    it('returns categories actually used by public store products', async () => {
      prisma.company.findFirst.mockResolvedValue(company);
      prisma.$queryRaw
        .mockResolvedValueOnce([storeRow])
        .mockResolvedValueOnce([
          {
            id: 'c1',
            name: 'Food',
            slug: 'food',
            icon: 'apple',
            product_count: 4,
          },
        ]);

      const result = await service.listCategories('company', 'store-1');

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].productCount).toBe(4);
      expect(result.categories[0].icon).toBe('apple');
    });
  });
});
