import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { TrendingService } from './trending.service.js';
import { PrismaService } from '@/db/prisma.service.js';

describe('TrendingService', () => {
  let service: TrendingService;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TrendingService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(TrendingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTrendingProductIds', () => {
    it('should normalize scores against the top result', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { target_id: 'p1', view_count: BigInt(20) },
        { target_id: 'p2', view_count: BigInt(10) },
      ]);

      const result = await service.getTrendingProductIds();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ targetId: 'p1', viewCount: 20, score: 1 });
      expect(result[1].score).toBeCloseTo(0.5, 10);
    });

    it('should return empty when there are no events', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      const result = await service.getTrendingProductIds();
      expect(result).toEqual([]);
    });
  });

  describe('getTrendingStoreIds', () => {
    it('should map store view counts', async () => {
      prisma.$queryRaw.mockResolvedValue([{ target_id: 's1', view_count: BigInt(5) }]);

      const result = await service.getTrendingStoreIds();

      expect(result[0]).toEqual({ targetId: 's1', viewCount: 5, score: 1 });
    });
  });

  describe('getProductViewCount', () => {
    it('should return the count for a product', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(7) }]);
      const count = await service.getProductViewCount('p1');
      expect(count).toBe(7);
    });

    it('should return 0 when there are no rows', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      const count = await service.getProductViewCount('p1');
      expect(count).toBe(0);
    });
  });
});
