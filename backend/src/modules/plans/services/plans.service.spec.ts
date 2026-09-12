import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { PlansService } from './plans.service.js';
import { PlanAccessService } from './plan-access.service.js';
import { PrismaService } from '@/db/prisma.service.js';

describe('PlansService', () => {
  let service: PlansService;
  let prisma: { plan: { findMany: jest.Mock; findUnique: jest.Mock }; companyPlan: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock }; company: { findUnique: jest.Mock } };
  let planAccessService: { checkLimit: jest.Mock };

  beforeEach(async () => {
    prisma = {
      plan: { findMany: jest.fn(), findUnique: jest.fn() },
      companyPlan: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      company: { findUnique: jest.fn() },
    };

    planAccessService = { checkLimit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        { provide: PrismaService, useValue: prisma },
        { provide: PlanAccessService, useValue: planAccessService },
      ],
    }).compile();

    service = module.get(PlansService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPlans', () => {
    it('should return active plans', async () => {
      const plans = [
        { id: '1', name: 'FREE', tier: 'FREE', maxStores: 1, maxProducts: 100, maxImports: 3, maxMembers: 2, analytics: false, alerts: false, active: true },
        { id: '2', name: 'PRO', tier: 'PRO', maxStores: 5, maxProducts: 1000, maxImports: 20, maxMembers: 10, analytics: true, alerts: true, active: true },
      ];
      prisma.plan.findMany.mockResolvedValue(plans);

      const result = await service.findAllPlans();
      expect(result).toHaveLength(2);
      expect(result[0].tier).toBe('FREE');
    });
  });

  describe('findCompanyPlan', () => {
    it('should return company plan', async () => {
      const companyPlan = {
        companyId: 'comp-1',
        plan: { id: '1', name: 'FREE', tier: 'FREE', maxStores: 1, maxProducts: 100, maxImports: 3, maxMembers: 2, analytics: false, alerts: false, active: true },
        startsAt: new Date(),
        endsAt: null,
      };
      prisma.companyPlan.findUnique.mockResolvedValue(companyPlan);

      const result = await service.findCompanyPlan('comp-1');
      expect(result.companyId).toBe('comp-1');
      expect(result.plan.tier).toBe('FREE');
    });

    it('should throw NotFoundException when no plan assigned', async () => {
      prisma.companyPlan.findUnique.mockResolvedValue(null);
      await expect(service.findCompanyPlan('comp-1')).rejects.toThrow('No active plan');
    });
  });

  describe('assignPlan', () => {
    it('should assign plan to company', async () => {
      const plan = { id: 'plan-1', name: 'PRO', tier: 'PRO', maxStores: 5, maxProducts: 1000, maxImports: 20, maxMembers: 10, analytics: true, alerts: true, active: true };
      const company = { id: 'comp-1', name: 'Company', status: 'ACTIVE', deletedAt: null };
      const companyPlan = { companyId: 'comp-1', plan, startsAt: new Date(), endsAt: null };

      prisma.plan.findUnique.mockResolvedValue(plan);
      prisma.company.findUnique.mockResolvedValue(company);
      prisma.companyPlan.findUnique.mockResolvedValue(null);
      prisma.companyPlan.create.mockResolvedValue(companyPlan);

      const result = await service.assignPlan('comp-1', 'plan-1', 'ADMIN');
      expect(result.plan.tier).toBe('PRO');
    });

    it('should reject non-ADMIN users', async () => {
      await expect(service.assignPlan('comp-1', 'plan-1', 'MERCHANT_OWNER')).rejects.toThrow('Only ADMIN');
    });
  });
});
