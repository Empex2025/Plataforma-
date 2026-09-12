import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryService } from './discovery.service.js';
import { TrendingService } from './trending.service.js';
import { NewItemsService } from './new-items.service.js';
import { PrismaService } from '@/db/prisma.service.js';

describe('DiscoveryService', () => {
  let service: DiscoveryService;

  const now = new Date();
  const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

  let prisma: {
    product: { findMany: jest.Mock };
    store: { findMany: jest.Mock };
    offer: { findMany: jest.Mock };
    inventory: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };

  const mockTrending = {
    getTrendingProductIds: jest.fn(),
    getTrendingStoreIds: jest.fn(),
    getProductViewCount: jest.fn(),
  };

  const mockNewItems = {
    getNewProductIds: jest.fn(),
    getNewStoreIds: jest.fn(),
  };

  const productRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'p1',
    companyId: 'c1',
    name: 'Tênis Runner',
    slug: 'tenis-runner',
    description: 'Tênis leve',
    imageUrl: null,
    sku: null,
    barcode: null,
    brandId: 'b1',
    status: 'ACTIVE',
    createdAt: recent,
    updatedAt: now,
    deletedAt: null,
    ratingAverage: { toNumber: () => 4.5 },
    ratingCount: 10,
    brand: { name: 'Acme' },
    categories: [{ category: { name: 'Calçados' } }],
    tags: [{ tag: { name: 'Esportivo' } }],
    prices: [{ value: { toNumber: () => 199.9 } }],
    inventory: [{ quantity: 5 }],
    ...overrides,
  });

  const storeRow = (overrides: Record<string, unknown> = {}) => ({
    id: 's1',
    companyId: 'c1',
    name: 'Loja Centro',
    slug: 'loja-centro',
    status: 'ACTIVE',
    createdAt: recent,
    updatedAt: now,
    deletedAt: null,
    ratingAverage: { toNumber: () => 4.0 },
    ratingCount: 5,
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      product: { findMany: jest.fn() },
      store: { findMany: jest.fn() },
      offer: { findMany: jest.fn() },
      inventory: { findMany: jest.fn() },
      $queryRaw: jest.fn(),
    };

    mockTrending.getTrendingProductIds.mockResolvedValue([]);
    mockTrending.getTrendingStoreIds.mockResolvedValue([]);
    mockNewItems.getNewProductIds.mockResolvedValue([]);
    mockNewItems.getNewStoreIds.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        { provide: PrismaService, useValue: prisma },
        { provide: TrendingService, useValue: mockTrending },
        { provide: NewItemsService, useValue: mockNewItems },
      ],
    }).compile();

    service = module.get(DiscoveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFeed', () => {
    it('should return products and stores ranked', async () => {
      prisma.product.findMany.mockResolvedValue([productRow()]);
      prisma.store.findMany.mockResolvedValue([storeRow()]);

      const result = await service.getFeed({});

      expect(result.total).toBe(2);
      expect(result.hits).toHaveLength(2);
      expect(result.hits[0].score).toBeGreaterThanOrEqual(result.hits[1].score);
    });

    it('should deduplicate results by type and id', async () => {
      prisma.product.findMany.mockResolvedValue([productRow()]);
      prisma.store.findMany.mockResolvedValue([storeRow({ id: 'p1' })]);

      const result = await service.getFeed({});

      const keys = result.hits.map((h) => `${h.type}:${h.id}`);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('should paginate results', async () => {
      prisma.product.findMany.mockResolvedValue([
        productRow({ id: 'p1' }),
        productRow({ id: 'p2' }),
        productRow({ id: 'p3' }),
      ]);
      prisma.store.findMany.mockResolvedValue([]);

      const result = await service.getFeed({ page: 2, limit: 2 });

      expect(result.hits).toHaveLength(1);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(2);
      expect(result.page).toBe(2);
    });

    it('should sort by price ascending', async () => {
      prisma.product.findMany.mockResolvedValue([
        productRow({ id: 'p1', prices: [{ value: { toNumber: () => 300 } }] }),
        productRow({ id: 'p2', prices: [{ value: { toNumber: () => 100 } }] }),
      ]);
      prisma.store.findMany.mockResolvedValue([]);

      const result = await service.getFeed({ sort: 'price_asc' });

      expect(result.hits[0].id).toBe('p2');
      expect(result.hits[1].id).toBe('p1');
    });
  });

  describe('getNew', () => {
    it('should return new products and stores', async () => {
      mockNewItems.getNewProductIds.mockResolvedValue(['p1']);
      mockNewItems.getNewStoreIds.mockResolvedValue(['s1']);
      prisma.product.findMany.mockResolvedValue([productRow()]);
      prisma.store.findMany.mockResolvedValue([storeRow()]);

      const result = await service.getNew({});

      expect(result.total).toBe(2);
      expect(result.hits.some((h) => h.reasons.includes('novidade'))).toBe(true);
    });

    it('should return empty when nothing is new', async () => {
      const result = await service.getNew({});
      expect(result.total).toBe(0);
      expect(result.hits).toEqual([]);
    });
  });

  describe('getTrending', () => {
    it('should return trending items ordered by score', async () => {
      mockTrending.getTrendingProductIds.mockResolvedValue([
        { targetId: 'p1', viewCount: 20, score: 1 },
      ]);
      mockTrending.getTrendingStoreIds.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([productRow()]);
      prisma.store.findMany.mockResolvedValue([]);

      const result = await service.getTrending({});

      expect(result.total).toBe(1);
      expect(result.hits[0].reasons).toContain('popular na região');
    });
  });

  describe('getOffers', () => {
    it('should return products from active offers', async () => {
      prisma.offer.findMany.mockResolvedValue([
        { id: 'o1', products: [{ productId: 'p1' }] },
      ]);
      prisma.product.findMany.mockResolvedValue([productRow()]);

      const result = await service.getOffers({});

      expect(result.total).toBe(1);
      expect(result.hits[0].reasons).toContain('em oferta');
    });

    it('should return empty when there are no offers', async () => {
      prisma.offer.findMany.mockResolvedValue([]);
      const result = await service.getOffers({});
      expect(result.total).toBe(0);
    });
  });

  describe('getNearby', () => {
    it('should return empty without coordinates', async () => {
      const result = await service.getNearby({});
      expect(result.total).toBe(0);
    });

    it('should return nearby stores with distance', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          id: 's1',
          name: 'Loja Centro',
          slug: 'loja-centro',
          company_id: 'c1',
          rating_average: 4.5,
          distance: 1200,
        },
      ]);
      prisma.inventory.findMany.mockResolvedValue([{ storeId: 's1' }]);

      const result = await service.getNearby({ lat: -23.5, lng: -46.6 });

      expect(result.total).toBe(1);
      expect(result.hits[0].distance).toBe(1200);
      expect(result.hits[0].reasons).toContain('perto de você');
      expect(result.hits[0].reasons).toContain('disponível agora');
    });
  });
});
