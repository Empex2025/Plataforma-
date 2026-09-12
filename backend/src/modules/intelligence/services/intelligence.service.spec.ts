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
    it('returns empty intelligence when the company has no stores', async () => {
      prisma.store.findMany.mockResolvedValue([]);

      const result = await service.getCompanyIntelligence('comp-1', new Date(), new Date());

      expect(result.companyId).toBe('comp-1');
      expect(result.topProducts).toHaveLength(0);
      expect(result.topStores).toHaveLength(0);
      expect(result.demandGap.totalViews).toBe(0);
    });

    it('returns company intelligence with data', async () => {
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
      prisma.event.findMany.mockImplementation((args: { where?: Record<string, unknown> }) => {
        if (args.where?.type === 'SEARCH') {
          return Promise.resolve([{ metadata: { query: 'arroz' } }]);
        }
        if (args.where?.targetType === 'store') {
          return Promise.resolve([{ targetId: 'store-1' }]);
        }
        return Promise.resolve([
          { targetId: 'prod-1', type: 'PRODUCT_VIEW' },
          { targetId: 'prod-1', type: 'WHATSAPP_CLICK' },
        ]);
      });
      prisma.event.count
        .mockResolvedValueOnce(10) // views
        .mockResolvedValueOnce(2); // contacts

      const result = await service.getCompanyIntelligence('comp-1', new Date(), new Date());

      expect(result.companyId).toBe('comp-1');
      expect(result.topProducts).toHaveLength(1);
      expect(result.topProducts[0].count).toBe(2);
      expect(result.topStores).toHaveLength(1);
      expect(result.demandGap.totalViews).toBe(10);
      expect(result.demandGap.totalContacts).toBe(2);
      expect(result.demandGap.conversionRate).toBe(20);
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
        if (type === 'SEARCH') return Promise.resolve(20);
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

    it('aggregates platform-wide metrics', async () => {
      mockPlatformData();

      const result = await service.getPlatformIntelligence(new Date(), new Date());

      expect(result.topProducts).toHaveLength(1);
      expect(result.topStores).toHaveLength(1);
      expect(result.topSearches[0].id).toBe('feijao');
      expect(result.topCompanies[0].id).toBe('comp-1');
      expect(result.totals.totalEvents).toBe(100);
      expect(result.totals.activeCompanies).toBe(3);
      expect(result.totals.activeStores).toBe(7);
      expect(result.totals.activeProducts).toBe(50);
      expect(result.totals.activeUsers).toBe(99);
      expect(result.demandGap.totalViews).toBe(40);
      expect(result.demandGap.totalContacts).toBe(10);
      expect(result.demandGap.conversionRate).toBe(25);
    });

    it('handles an empty platform gracefully', async () => {
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

      expect(result.topProducts).toHaveLength(0);
      expect(result.topCompanies).toHaveLength(0);
      expect(result.demandGap.conversionRate).toBe(0);
      expect(result.totals.totalEvents).toBe(0);
    });
  });
});
