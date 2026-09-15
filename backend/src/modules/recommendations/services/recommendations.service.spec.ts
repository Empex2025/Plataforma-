import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsService } from './recommendations.service.js';
import { PrismaService } from '@/db/prisma.service.js';
import { IntelligenceSignalsService } from '@/modules/intelligence/services/intelligence-signals.service.js';

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let prisma: {
    product: { findMany: jest.Mock; findUnique: jest.Mock };
    store: { findMany: jest.Mock; findUnique: jest.Mock };
    offer: { findMany: jest.Mock };
    price: { findMany: jest.Mock };
    inventory: { findMany: jest.Mock };
    event: { findMany: jest.Mock };
    favorite: { findMany: jest.Mock };
    productCategory: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let intelligenceSignals: { getPopularityScore: jest.Mock };

  beforeEach(async () => {
    prisma = {
      product: { findMany: jest.fn(), findUnique: jest.fn() },
      store: { findMany: jest.fn(), findUnique: jest.fn() },
      offer: { findMany: jest.fn() },
      price: { findMany: jest.fn() },
      inventory: { findMany: jest.fn() },
      event: { findMany: jest.fn() },
      favorite: { findMany: jest.fn() },
      productCategory: { findMany: jest.fn() },
      $queryRaw: jest.fn(),
    };

    intelligenceSignals = {
      getPopularityScore: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: IntelligenceSignalsService, useValue: intelligenceSignals },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProductRecommendations', () => {
    it('should return empty when no products exist', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.event.findMany.mockResolvedValue([]);
      intelligenceSignals.getPopularityScore.mockResolvedValue([]);

      const result = await service.getProductRecommendations({});

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return products when available', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'product-1',
          companyId: 'company-1',
          name: 'Test Product',
          slug: 'test-product',
          imageUrl: null,
          ratingAverage: { toNumber: () => 4.5 },
          ratingCount: 10,
          createdAt: new Date(),
          brand: null,
          categories: [],
          tags: [],
          prices: [{ value: { toNumber: () => 100 } }],
          inventory: [{ quantity: 5, storeId: 'store-1' }],
        },
      ]);

      prisma.event.findMany.mockResolvedValue([]);
      prisma.offer.findMany.mockResolvedValue([]);
      intelligenceSignals.getPopularityScore.mockResolvedValue([
        { id: 'product-1', score: 5 },
      ]);

      const result = await service.getProductRecommendations({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('product-1');
      expect(result.items[0].type).toBe('product');
    });

    it('should filter by category', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.event.findMany.mockResolvedValue([]);
      intelligenceSignals.getPopularityScore.mockResolvedValue([]);

      await service.getProductRecommendations({ categoryId: 'cat-1' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categories: { some: { categoryId: 'cat-1' } },
          }),
        })
      );
    });
  });

  describe('getStoreRecommendations', () => {
    it('should return empty when no stores exist', async () => {
      prisma.store.findMany.mockResolvedValue([]);
      prisma.event.findMany.mockResolvedValue([]);
      intelligenceSignals.getPopularityScore.mockResolvedValue([]);

      const result = await service.getStoreRecommendations({});

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return stores when available', async () => {
      prisma.store.findMany.mockResolvedValue([
        {
          id: 'store-1',
          companyId: 'company-1',
          name: 'Test Store',
          slug: 'test-store',
          ratingAverage: { toNumber: () => 4.5 },
          ratingCount: 10,
          createdAt: new Date(),
        },
      ]);

      prisma.event.findMany.mockResolvedValue([]);
      prisma.inventory.findMany.mockResolvedValue([{ storeId: 'store-1' }]);
      intelligenceSignals.getPopularityScore.mockResolvedValue([
        { id: 'store-1', score: 5 },
      ]);

      const result = await service.getStoreRecommendations({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('store-1');
      expect(result.items[0].type).toBe('store');
    });
  });

  describe('getOfferRecommendations', () => {
    it('should return empty when no offers exist', async () => {
      prisma.offer.findMany.mockResolvedValue([]);
      prisma.event.findMany.mockResolvedValue([]);

      const result = await service.getOfferRecommendations({});

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return offers when available', async () => {
      prisma.offer.findMany.mockResolvedValue([
        {
          id: 'offer-1',
          companyId: 'company-1',
          title: 'Test Offer',
          discountType: 'PERCENTAGE',
          discountValue: { toNumber: () => 20 },
          products: [
            {
              product: {
                id: 'product-1',
                companyId: 'company-1',
                name: 'Product in Offer',
                slug: 'product-in-offer',
                imageUrl: null,
                ratingAverage: { toNumber: () => 4.0 },
                ratingCount: 5,
                createdAt: new Date(),
                categories: [],
                prices: [{ value: { toNumber: () => 100 } }],
                inventory: [{ quantity: 3 }],
              },
            },
          ],
        },
      ]);

      prisma.event.findMany.mockResolvedValue([]);

      const result = await service.getOfferRecommendations({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('offer');
    });
  });

  describe('getSimilarProducts', () => {
    it('should return empty when source product not found', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      const result = await service.getSimilarProducts('nonexistent', {});

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return similar products based on categories and tags', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'product-1',
        categories: [{ categoryId: 'cat-1' }],
        tags: [{ tagId: 'tag-1' }],
        brandId: 'brand-1',
      });

      prisma.product.findMany.mockResolvedValue([
        {
          id: 'product-2',
          companyId: 'company-1',
          name: 'Similar Product',
          slug: 'similar-product',
          imageUrl: null,
          ratingAverage: { toNumber: () => 4.0 },
          ratingCount: 5,
          createdAt: new Date(),
          categories: [{ categoryId: 'cat-1' }],
          tags: [],
          prices: [{ value: { toNumber: () => 100 } }],
          inventory: [{ quantity: 5 }],
        },
      ]);

      prisma.event.findMany.mockResolvedValue([]);

      const result = await service.getSimilarProducts('product-1', {});

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('product-2');
    });
  });
});
