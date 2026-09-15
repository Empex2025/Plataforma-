import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { IntelligenceService } from './intelligence.service.js';
import { PrismaService } from '@/db/prisma.service.js';
import { PlanAccessService } from '@/modules/plans/services/plan-access.service.js';

describe('IntelligenceService', () => {
  let service: IntelligenceService;
  let prisma: {
    $queryRaw: jest.Mock;
    store: { findMany: jest.Mock; count: jest.Mock };
    product: { findMany: jest.Mock; count: jest.Mock };
    company: { findMany: jest.Mock; count: jest.Mock };
    user: { count: jest.Mock };
    event: { count: jest.Mock };
  };
  let planAccess: { can: jest.Mock };

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn(),
      store: { findMany: jest.fn(), count: jest.fn() },
      product: { findMany: jest.fn(), count: jest.fn() },
      company: { findMany: jest.fn(), count: jest.fn() },
      user: { count: jest.fn() },
      event: { count: jest.fn() },
    };
    planAccess = { can: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntelligenceService,
        { provide: PrismaService, useValue: prisma },
        { provide: PlanAccessService, useValue: planAccess },
      ],
    }).compile();

    service = module.get(IntelligenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCompanyIntelligence', () => {
    it('returns empty intelligence when the company has no stores nor products', async () => {
      prisma.store.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.getCompanyIntelligence('comp-1', new Date(), new Date());

      expect(result.companyId).toBe('comp-1');
      expect(result.topProducts).toHaveLength(0);
      expect(result.topStores).toHaveLength(0);
      expect(result.engagement.productViews).toBe(0);
      expect(result.contactFunnel.totalViews).toBe(0);
      expect(result.contactFunnel.heuristicDisclaimer).toBe('HEURISTICO_NAO_DEFINITIVO');
    });

    it('returns company intelligence with engagement metrics', async () => {
      prisma.store.findMany.mockImplementation((args: { select?: Record<string, unknown> }) =>
        Promise.resolve(
          args.select && 'name' in args.select
            ? [{ id: 'store-1', name: 'Store 1' }]
            : [{ id: 'store-1' }],
        ),
      );
      prisma.product.findMany.mockImplementation((args: { select?: Record<string, unknown> }) =>
        Promise.resolve(
          args.select && 'name' in args.select
            ? [{ id: 'prod-1', name: 'Product 1' }]
            : [{ id: 'prod-1' }],
        ),
      );

      prisma.$queryRaw.mockResolvedValue([]);

      prisma.event.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3);

      const result = await service.getCompanyIntelligence('comp-1', new Date(), new Date());

      expect(result.companyId).toBe('comp-1');
      expect(result.engagement.productViews).toBe(10);
      expect(result.engagement.storeViews).toBe(5);
      expect(result.engagement.productFavorites).toBe(2);
      expect(result.engagement.storeFavorites).toBe(1);
      expect(result.engagement.contacts).toBe(3);
      expect(result.engagement.reviewsCreated).toBe(1);
      expect(result.engagement.reviewsApproved).toBe(1);
      expect(result.contactFunnel.totalViews).toBe(5);
      expect(result.contactFunnel.totalContacts).toBe(3);
      expect(result.contactFunnel.conversionRate).toBe(60);
      expect(result.contactFunnel.heuristicDisclaimer).toBe('HEURISTICO_NAO_DEFINITIVO');
    });
  });

  describe('getCompanyDemandGap', () => {
    it('returns unmet searches and category gaps', async () => {
      prisma.store.findMany.mockResolvedValue([{ id: 's1' }]);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: 'P1' }]);

      prisma.$queryRaw
        .mockResolvedValueOnce([{ query: 'arroz organico', cnt: 5n }])
        .mockResolvedValueOnce([{ categoryId: 'cat-1', categoryName: 'Alimentos', demand: 20n }])
        .mockResolvedValueOnce([{ categoryId: 'cat-1', cnt: 3n }]);

      const result = await service.getCompanyDemandGap('comp-1', new Date(), new Date());

      expect(result.unmetSearches).toHaveLength(1);
      expect(result.unmetSearches[0].query).toBe('arroz organico');
      expect(result.unmetSearches[0].count).toBe(5);
      expect(result.categoryGaps).toHaveLength(1);
      expect(result.categoryGaps[0].categoryId).toBe('cat-1');
      expect(result.categoryGaps[0].demand).toBe(20);
      expect(result.categoryGaps[0].supply).toBe(3);
    });
  });

  describe('getPlatformIntelligence', () => {
    it('aggregates platform-wide metrics', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ query: 'feijao', cnt: 10n }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      prisma.event.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(40)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(60);

      prisma.company.findMany.mockResolvedValue([{ id: 'comp-1', name: 'Company 1' }]);
      prisma.company.count.mockResolvedValue(3);
      prisma.store.count.mockResolvedValue(7);
      prisma.product.count.mockResolvedValue(50);
      prisma.user.count.mockResolvedValue(99);

      const result = await service.getPlatformIntelligence(new Date(), new Date());

      expect(result.totals.totalEvents).toBe(100);
      expect(result.totals.totalViews).toBe(40);
      expect(result.totals.totalContacts).toBe(10);
      expect(result.totals.totalSearches).toBe(60);
      expect(result.totals.activeCompanies).toBe(3);
      expect(result.topSearches).toHaveLength(1);
      expect(result.topSearches[0].name).toBe('feijao');
    });

    it('handles an empty platform gracefully', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      prisma.event.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.store.findMany.mockResolvedValue([]);
      prisma.company.findMany.mockResolvedValue([]);
      prisma.company.count.mockResolvedValue(0);
      prisma.store.count.mockResolvedValue(0);
      prisma.product.count.mockResolvedValue(0);
      prisma.user.count.mockResolvedValue(0);

      const result = await service.getPlatformIntelligence(new Date(), new Date());

      expect(result.totals.totalEvents).toBe(0);
      expect(result.topProducts).toHaveLength(0);
    });
  });

  describe('getTopSearches', () => {
    it('returns top searches from SQL aggregation', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { query: 'arroz', cnt: 15n },
        { query: 'feijao', cnt: 10n },
      ]);

      const result = await service.getTopSearches(new Date(), new Date());

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('arroz');
      expect(result[0].count).toBe(15);
    });
  });
});
