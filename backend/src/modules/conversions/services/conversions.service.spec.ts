import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { ConversionsService } from './conversions.service.js';
import { PrismaService } from '@/db/prisma.service.js';

describe('ConversionsService', () => {
  let service: ConversionsService;
  let prisma: {
    conversion: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    campaign: { findUnique: jest.Mock; update: jest.Mock };
    campaignMetric: { upsert: jest.Mock };
    store: { findUnique: jest.Mock };
    product: { findUnique: jest.Mock };
    offer: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  const companyId = 'company-1';

  const createdConversion = {
    id: 'conv-1',
    companyId,
    campaignId: 'campaign-1',
    targetType: null,
    targetId: null,
    revenue: 100,
    quantity: 1,
    currency: 'BRL',
    attributionType: 'CLICK',
    source: 'platform',
    externalRef: null,
    occurredAt: new Date('2026-09-15T10:00:00.000Z'),
    createdAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      conversion: {
        create: jest.fn().mockImplementation(async (args: { data: Record<string, unknown> }) => ({
          id: 'conv-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...args.data,
        })),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      campaign: { findUnique: jest.fn().mockResolvedValue({ companyId }), update: jest.fn().mockResolvedValue({}) },
      campaignMetric: { upsert: jest.fn().mockResolvedValue({}) },
      store: { findUnique: jest.fn() },
      product: { findUnique: jest.fn() },
      offer: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback(prisma),
    );

    service = new ConversionsService(prisma as unknown as PrismaService);
  });

  describe('register', () => {
    it('registers an organic conversion without touching campaign aggregates', async () => {
      const result = await service.register(companyId, { revenue: 50 });

      expect(result.id).toBe('conv-1');
      expect(prisma.conversion.create).toHaveBeenCalledTimes(1);
      expect(prisma.campaign.update).not.toHaveBeenCalled();
      expect(prisma.campaignMetric.upsert).not.toHaveBeenCalled();
    });

    it('updates campaign and daily metrics when attributed to a campaign', async () => {
      await service.register(companyId, { revenue: 100, campaignId: 'campaign-1' });

      expect(prisma.campaign.findUnique).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        select: { companyId: true },
      });
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { conversions: { increment: 1 }, revenue: { increment: 100 } },
      });
      expect(prisma.campaignMetric.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { conversions: { increment: 1 }, revenue: { increment: 100 } },
          create: expect.objectContaining({ conversions: 1, revenue: 100 }),
        }),
      );
    });

    it('is idempotent when externalRef already exists', async () => {
      prisma.conversion.findUnique.mockResolvedValueOnce(createdConversion);

      const result = await service.register(companyId, { revenue: 100, externalRef: 'order-1' });

      expect(result.id).toBe('conv-1');
      expect(prisma.conversion.create).not.toHaveBeenCalled();
    });

    it('handles a concurrent duplicate via unique violation', async () => {
      prisma.conversion.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createdConversion);
      prisma.conversion.create.mockRejectedValueOnce({ code: 'P2002' });

      const result = await service.register(companyId, { revenue: 100, externalRef: 'order-1' });

      expect(result.id).toBe('conv-1');
      expect(prisma.conversion.findUnique).toHaveBeenCalledTimes(2);
    });

    it('rejects a campaign from another company', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({ companyId: 'other-company' });

      await expect(
        service.register(companyId, { revenue: 10, campaignId: 'campaign-x' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.conversion.create).not.toHaveBeenCalled();
    });

    it('rejects a target that does not belong to the company', async () => {
      prisma.product.findUnique.mockResolvedValueOnce({ companyId: 'other-company' });

      await expect(
        service.register(companyId, { revenue: 10, targetType: 'product', targetId: 'product-1' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.conversion.create).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('returns a paginated result scoped to the company', async () => {
      prisma.conversion.findMany.mockResolvedValue([createdConversion]);
      prisma.conversion.count.mockResolvedValue(1);

      const result = await service.list(companyId, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(prisma.conversion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId }, skip: 0, take: 20 }),
      );
    });

    it('applies campaign and date filters', async () => {
      await service.list(companyId, {
        campaignId: 'campaign-1',
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-30T00:00:00.000Z',
      });

      const where = prisma.conversion.findMany.mock.calls[0][0].where;
      expect(where.companyId).toBe(companyId);
      expect(where.campaignId).toBe('campaign-1');
      expect(where.occurredAt.gte).toBeInstanceOf(Date);
      expect(where.occurredAt.lte).toBeInstanceOf(Date);
    });
  });
});
