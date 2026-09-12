import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { PlanAccessService } from './plan-access.service.js';
import { PrismaService } from '../../db/prisma.service.js';
import { PlanFeature } from './plan.constants.js';

describe('PlanAccessService', () => {
  let service: PlanAccessService;
  let prisma: {
    companyPlan: { findUnique: jest.Mock };
    plan: { findUnique: jest.Mock };
    store: { count: jest.Mock };
    product: { count: jest.Mock };
    importJob: { count: jest.Mock };
    userCompany: { count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      companyPlan: { findUnique: jest.fn() },
      plan: { findUnique: jest.fn() },
      store: { count: jest.fn() },
      product: { count: jest.fn() },
      importJob: { count: jest.fn() },
      userCompany: { count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(PlanAccessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('can', () => {
    it('should return true for FREE plan with basic features', async () => {
      prisma.companyPlan.findUnique.mockResolvedValue(null);
      prisma.plan.findUnique.mockResolvedValue({
        tier: 'FREE',
        maxStores: 1,
        maxProducts: 100,
        maxImports: 3,
        maxMembers: 2,
        analytics: false,
        alerts: false,
        active: true,
      });

      const result = await service.can('comp-1', PlanFeature.MAX_STORES);
      expect(result).toBe(true);
    });

    it('should return false for FREE plan with analytics', async () => {
      prisma.companyPlan.findUnique.mockResolvedValue(null);
      prisma.plan.findUnique.mockResolvedValue({
        tier: 'FREE',
        maxStores: 1,
        maxProducts: 100,
        maxImports: 3,
        maxMembers: 2,
        analytics: false,
        alerts: false,
        active: true,
      });

      const result = await service.can('comp-1', PlanFeature.ANALYTICS);
      expect(result).toBe(false);
    });
  });

  describe('checkLimit', () => {
    it('should return allowed when under limit', async () => {
      prisma.companyPlan.findUnique.mockResolvedValue(null);
      prisma.plan.findUnique.mockResolvedValue({
        tier: 'FREE',
        maxStores: 1,
        maxProducts: 100,
        maxImports: 3,
        maxMembers: 2,
        analytics: false,
        alerts: false,
        active: true,
      });
      prisma.store.count.mockResolvedValue(0);

      const result = await service.checkLimit('comp-1', PlanFeature.MAX_STORES);
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
      expect(result.limit).toBe(1);
    });

    it('should return not allowed when at limit', async () => {
      prisma.companyPlan.findUnique.mockResolvedValue(null);
      prisma.plan.findUnique.mockResolvedValue({
        tier: 'FREE',
        maxStores: 1,
        maxProducts: 100,
        maxImports: 3,
        maxMembers: 2,
        analytics: false,
        alerts: false,
        active: true,
      });
      prisma.store.count.mockResolvedValue(1);

      const result = await service.checkLimit('comp-1', PlanFeature.MAX_STORES);
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(1);
      expect(result.limit).toBe(1);
    });
  });
});
