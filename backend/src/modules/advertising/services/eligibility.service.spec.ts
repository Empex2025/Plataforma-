import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { EligibilityService } from './eligibility.service.js';
import { PrismaService } from '@/db/prisma.service.js';
import { PlanAccessService } from '@/modules/plans/services/plan-access.service.js';

describe('EligibilityService', () => {
  let service: EligibilityService;
  let prisma: {
    campaign: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };
  let planAccess: { can: jest.Mock };

  beforeEach(async () => {
    prisma = {
      campaign: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    planAccess = { can: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EligibilityService,
        { provide: PrismaService, useValue: prisma },
        { provide: PlanAccessService, useValue: planAccess },
      ],
    }).compile();

    service = module.get<EligibilityService>(EligibilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findEligibleSponsoredItems', () => {
    it('should return empty array when no active campaigns', async () => {
      prisma.campaign.findMany.mockResolvedValue([]);

      const result = await service.findEligibleSponsoredItems({
        companyId: 'company-1',
        targetType: 'product',
        targetId: 'target-1',
      });

      expect(result).toEqual([]);
    });

    it('should return eligible items for active campaigns', async () => {
      prisma.campaign.findMany.mockResolvedValue([
        {
          id: 'campaign-1',
          status: 'ACTIVE',
          startAt: null,
          endAt: null,
          targetJson: null,
          company: { id: 'company-1', status: 'ACTIVE' },
          items: [
            {
              id: 'item-1',
              targetType: 'product',
              targetId: 'product-1',
              weight: 5,
            },
          ],
        },
      ]);
      planAccess.can.mockResolvedValue(true);

      const result = await service.findEligibleSponsoredItems({
        companyId: 'company-1',
        targetType: 'product',
        targetId: 'product-1',
      });

      expect(result).toHaveLength(1);
      expect(result[0].campaignId).toBe('campaign-1');
      expect(result[0].targetId).toBe('product-1');
    });

    it('should exclude campaigns without ADVERTISING access', async () => {
      prisma.campaign.findMany.mockResolvedValue([
        {
          id: 'campaign-1',
          status: 'ACTIVE',
          startAt: null,
          endAt: null,
          targetJson: null,
          company: { id: 'company-1', status: 'ACTIVE' },
          items: [
            {
              id: 'item-1',
              targetType: 'product',
              targetId: 'product-1',
              weight: 5,
            },
          ],
        },
      ]);
      planAccess.can.mockResolvedValue(false);

      const result = await service.findEligibleSponsoredItems({
        companyId: 'company-1',
        targetType: 'product',
        targetId: 'product-1',
      });

      expect(result).toEqual([]);
    });

    it('should exclude inactive companies', async () => {
      prisma.campaign.findMany.mockResolvedValue([
        {
          id: 'campaign-1',
          status: 'ACTIVE',
          startAt: null,
          endAt: null,
          targetJson: null,
          company: { id: 'company-1', status: 'INACTIVE' },
          items: [
            {
              id: 'item-1',
              targetType: 'product',
              targetId: 'product-1',
              weight: 5,
            },
          ],
        },
      ]);
      planAccess.can.mockResolvedValue(true);

      const result = await service.findEligibleSponsoredItems({
        companyId: 'company-1',
        targetType: 'product',
        targetId: 'product-1',
      });

      expect(result).toEqual([]);
    });
  });

  describe('validateSponsoredItemEligibility', () => {
    it('should return true for valid eligible item', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        status: 'ACTIVE',
        startAt: null,
        endAt: null,
        company: { id: 'company-1', status: 'ACTIVE' },
      });
      planAccess.can.mockResolvedValue(true);

      const result = await service.validateSponsoredItemEligibility(
        'campaign-1',
        'product',
        'product-1',
      );

      expect(result).toBe(true);
    });

    it('should return false when campaign not found', async () => {
      prisma.campaign.findUnique.mockResolvedValue(null);

      const result = await service.validateSponsoredItemEligibility(
        'campaign-1',
        'product',
        'product-1',
      );

      expect(result).toBe(false);
    });

    it('should return false when campaign is not ACTIVE', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        status: 'DRAFT',
        startAt: null,
        endAt: null,
        company: { id: 'company-1', status: 'ACTIVE' },
      });

      const result = await service.validateSponsoredItemEligibility(
        'campaign-1',
        'product',
        'product-1',
      );

      expect(result).toBe(false);
    });

    it('should return false when company is not ACTIVE', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        status: 'ACTIVE',
        startAt: null,
        endAt: null,
        company: { id: 'company-1', status: 'INACTIVE' },
      });

      const result = await service.validateSponsoredItemEligibility(
        'campaign-1',
        'product',
        'product-1',
      );

      expect(result).toBe(false);
    });
  });

  describe('budget participation (P-02)', () => {
    function activeCampaignWithBudget(budget: number | null, spend: number) {
      return [
        {
          id: 'campaign-1',
          status: 'ACTIVE',
          startAt: null,
          endAt: null,
          budget,
          spend,
          targetJson: null,
          company: { id: 'company-1', status: 'ACTIVE' },
          items: [
            {
              id: 'item-1',
              targetType: 'product',
              targetId: 'product-1',
              weight: 5,
            },
          ],
        },
      ];
    }

    it('should keep campaign eligible when spend is below budget', async () => {
      prisma.campaign.findMany.mockResolvedValue(activeCampaignWithBudget(100, 10));
      planAccess.can.mockResolvedValue(true);

      const result = await service.findEligibleSponsoredItems({
        companyId: 'company-1',
        targetType: 'product',
        targetId: 'product-1',
      });

      expect(result).toHaveLength(1);
    });

    it('should exclude campaign when spend equals budget', async () => {
      prisma.campaign.findMany.mockResolvedValue(activeCampaignWithBudget(100, 100));
      planAccess.can.mockResolvedValue(true);

      const result = await service.findEligibleSponsoredItems({
        companyId: 'company-1',
        targetType: 'product',
        targetId: 'product-1',
      });

      expect(result).toEqual([]);
    });

    it('should exclude campaign when spend exceeds budget', async () => {
      prisma.campaign.findMany.mockResolvedValue(activeCampaignWithBudget(100, 150));
      planAccess.can.mockResolvedValue(true);

      const result = await service.findEligibleSponsoredItems({
        companyId: 'company-1',
        targetType: 'product',
        targetId: 'product-1',
      });

      expect(result).toEqual([]);
    });

    it('should keep campaign eligible when no budget is set', async () => {
      prisma.campaign.findMany.mockResolvedValue(activeCampaignWithBudget(null, 999));
      planAccess.can.mockResolvedValue(true);

      const result = await service.findEligibleSponsoredItems({
        companyId: 'company-1',
        targetType: 'product',
        targetId: 'product-1',
      });

      expect(result).toHaveLength(1);
    });

    it('should return false on validation when budget is exhausted', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        status: 'ACTIVE',
        startAt: null,
        endAt: null,
        budget: 100,
        spend: 100,
        company: { id: 'company-1', status: 'ACTIVE' },
      });
      planAccess.can.mockResolvedValue(true);

      const result = await service.validateSponsoredItemEligibility(
        'campaign-1',
        'product',
        'product-1',
      );

      expect(result).toBe(false);
    });
  });
});
