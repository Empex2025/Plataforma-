import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { IntelligenceService } from './intelligence.service.js';
import { PrismaService } from '@/db/prisma.service.js';

describe('IntelligenceService', () => {
  let service: IntelligenceService;
  let prisma: {
    store: { findMany: jest.Mock; count: jest.Mock };
    product: { findMany: jest.Mock; count: jest.Mock };
    company: { findMany: jest.Mock; count: jest.Mock };
    user: { count: jest.Mock };
    event: { findMany: jest.Mock; count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      store: { findMany: jest.fn(), count: jest.fn() },
      product: { findMany: jest.fn(), count: jest.fn() },
      company: { findMany: jest.fn(), count: jest.fn() },
      user: { count: jest.fn() },
      event: { findMany: jest.fn(), count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [IntelligenceService, { provide: PrismaService, useValue: prisma }],
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
      expect(result.demandGap.totalViews).toBe(0);
      expect(result.demandGap.g1).toBe(0);
      expect(result.demandGap.g3).toBe(0);
      expect(result.demandGap.demandGap).toBe(0);
      expect(result.demandGap.heuristicDisclaimer).toBe('HEURISTICO_NAO_DEFINITIVO');
    });

    it('returns company intelligence with G1, G3, DemandGap (G1+G3) and heuristic disclaimer', async () => {
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
      prisma.event.findMany.mockImplementation((args: { where?: Record<string, unknown>; select?: Record<string, unknown> }) => {
        if (args.where?.type === 'SEARCH') {
          return Promise.resolve([{ metadata: { query: 'arroz' } }]);
        }
        if (args.where?.targetType === 'store') {
          return Promise.resolve([{ targetId: 'store-1' }]);
        }
        if (args.select && 'userId' in args.select) {
          return Promise.resolve([{ userId: 'u1', sessionId: 's1' }]);
        }
        return Promise.resolve([
          { targetId: 'prod-1', type: 'PRODUCT_VIEW' },
          { targetId: 'prod-1', type: 'WHATSAPP_CLICK' },
        ]);
      });
      prisma.event.count
        .mockResolvedValueOnce(10) // totalViews (PRODUCT_VIEW in company products)
        .mockResolvedValueOnce(2)  // totalContacts (WHATSAPP|PHONE in company products)
        .mockResolvedValueOnce(15); // totalSearches (relevant searches by same users/sessions)

      const result = await service.getCompanyIntelligence('comp-1', new Date(), new Date());

      expect(result.companyId).toBe('comp-1');
      expect(result.topProducts).toHaveLength(1);
      expect(result.topStores).toHaveLength(1);

      expect(result.demandGap.totalViews).toBe(10);
      expect(result.demandGap.totalContacts).toBe(2);
      expect(result.demandGap.totalSearches).toBe(15);
      expect(result.demandGap.conversionRate).toBe(20);

      const expectedG1 = Math.max(0, 15 - 10); // 5
      const expectedG3 = Math.max(0, 10 - 2);  // 8
      expect(result.demandGap.g1).toBe(expectedG1);
      expect(result.demandGap.g3).toBe(expectedG3);
      expect(result.demandGap.demandGap).toBe(expectedG1 + expectedG3);

      expect(result.demandGap.heuristicDisclaimer).toBe('HEURISTICO_NAO_DEFINITIVO');
    });

    it('G1 is clamped to 0 when totalViews >= totalSearches', async () => {
      prisma.store.findMany.mockResolvedValue([{ id: 's1' }]);
      prisma.product.findMany.mockImplementation((args: { select?: Record<string, unknown> }) =>
        Promise.resolve(
          args.select && 'name' in args.select
            ? [{ id: 'p1', name: 'P1' }]
            : [{ id: 'p1' }],
        ),
      );
      prisma.event.findMany.mockImplementation((args: { select?: Record<string, unknown> }) => {
        if (args.select && 'userId' in args.select) {
          return Promise.resolve([{ userId: 'u1', sessionId: null }]);
        }
        return Promise.resolve([]);
      });
      prisma.event.count
        .mockResolvedValueOnce(10) // views
        .mockResolvedValueOnce(8)  // contacts
        .mockResolvedValueOnce(5); // searches

      const result = await service.getCompanyIntelligence('comp-1', new Date(), new Date());

      expect(result.demandGap.g1).toBe(0); // max(0, 5 - 10) = 0
      expect(result.demandGap.g3).toBe(2); // max(0, 10 - 8) = 2
      expect(result.demandGap.demandGap).toBe(2);
    });
  });

  describe('getPlatformIntelligence', () => {
    function mockPlatformData(): void {
      prisma.event.findMany.mockImplementation((args: { where?: Record<string, unknown> }) => {
        if (args.where?.type === 'SEARCH') {
          return Promise.resolve([{ metadata: { query: 'feijao' } }]);
        }
        if (args.where?.targetType === 'store') {
          return Promise.resolve([{ targetId: 'store-1' }]);
        }
        return Promise.resolve([{ targetId: 'prod-1', type: 'PRODUCT_VIEW' }]);
      });
      prisma.event.count.mockImplementation((args: { where?: Record<string, unknown> }) => {
        const type = args.where?.type;
        if (type === 'PRODUCT_VIEW') return Promise.resolve(40);
        if (type === 'SEARCH') return Promise.resolve(60);
        if (type && typeof type === 'object' && Array.isArray((type as { in?: unknown[] }).in)) {
          return Promise.resolve(10);
        }
        return Promise.resolve(100);
      });
      prisma.product.findMany.mockImplementation((args: { select?: Record<string, unknown> }) =>
        Promise.resolve(
          args.select && 'companyId' in args.select
            ? [{ id: 'prod-1', companyId: 'comp-1' }]
            : [{ id: 'prod-1', name: 'Product 1' }],
        ),
      );
      prisma.store.findMany.mockImplementation((args: { select?: Record<string, unknown> }) =>
        Promise.resolve(
          args.select && 'companyId' in args.select
            ? [{ id: 'store-1', companyId: 'comp-1' }]
            : [{ id: 'store-1', name: 'Store 1' }],
        ),
      );
      prisma.company.findMany.mockResolvedValue([{ id: 'comp-1', name: 'Company 1' }]);
      prisma.company.count.mockResolvedValue(3);
      prisma.store.count.mockResolvedValue(7);
      prisma.product.count.mockResolvedValue(50);
      prisma.user.count.mockResolvedValue(99);
    }

    it('aggregates platform-wide metrics with G1, G3 and DemandGap=G1+G3', async () => {
      mockPlatformData();

      const result = await service.getPlatformIntelligence(new Date(), new Date());

      expect(result.totals.totalEvents).toBe(100);
      expect(result.demandGap.totalViews).toBe(40);
      expect(result.demandGap.totalContacts).toBe(10);
      expect(result.demandGap.totalSearches).toBe(60);

      const expectedG1 = Math.max(0, 60 - 40); // 20
      const expectedG3 = Math.max(0, 40 - 10); // 30
      expect(result.demandGap.g1).toBe(expectedG1);
      expect(result.demandGap.g3).toBe(expectedG3);
      expect(result.demandGap.demandGap).toBe(expectedG1 + expectedG3);
      expect(result.demandGap.heuristicDisclaimer).toBe('HEURISTICO_NAO_DEFINITIVO');
    });

    it('handles an empty platform gracefully with all heuristic fields zeroed', async () => {
      prisma.event.findMany.mockResolvedValue([]);
      prisma.event.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.store.findMany.mockResolvedValue([]);
      prisma.company.findMany.mockResolvedValue([]);
      prisma.company.count.mockResolvedValue(0);
      prisma.store.count.mockResolvedValue(0);
      prisma.product.count.mockResolvedValue(0);
      prisma.user.count.mockResolvedValue(0);

      const result = await service.getPlatformIntelligence(new Date(), new Date());

      expect(result.demandGap.g1).toBe(0);
      expect(result.demandGap.g3).toBe(0);
      expect(result.demandGap.demandGap).toBe(0);
      expect(result.demandGap.heuristicDisclaimer).toBe('HEURISTICO_NAO_DEFINITIVO');
    });
  });
});
