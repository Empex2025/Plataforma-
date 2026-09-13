import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { CampaignsService } from './campaigns.service.js';
import { PrismaService } from '@/db/prisma.service.js';
import { PlanAccessService } from '@/modules/plans/services/plan-access.service.js';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('CampaignsService', () => {
  let service: CampaignsService;
  let prisma: {
    campaign: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    sponsoredItem: { create: jest.Mock };
    store: { findUnique: jest.Mock };
    product: { findUnique: jest.Mock };
    offer: { findUnique: jest.Mock };
    campaignMetric: { aggregate: jest.Mock };
  };
  let planAccess: { can: jest.Mock };

  beforeEach(async () => {
    prisma = {
      campaign: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      sponsoredItem: { create: jest.fn() },
      store: { findUnique: jest.fn() },
      product: { findUnique: jest.fn() },
      offer: { findUnique: jest.fn() },
      campaignMetric: { aggregate: jest.fn() },
    };
    planAccess = { can: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PlanAccessService, useValue: planAccess },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a campaign when advertising is allowed', async () => {
      planAccess.can.mockResolvedValue(true);
      prisma.campaign.create.mockResolvedValue({
        id: 'campaign-1',
        companyId: 'company-1',
        name: 'Test Campaign',
        status: 'DRAFT',
        startAt: null,
        endAt: null,
        budget: null,
        targetJson: null,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        companyId: 'company-1',
        name: 'Test Campaign',
        status: 'DRAFT',
        startAt: null,
        endAt: null,
        budget: null,
        targetJson: null,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create('company-1', { name: 'Test Campaign' });

      expect(result.id).toBe('campaign-1');
      expect(result.name).toBe('Test Campaign');
      expect(planAccess.can).toHaveBeenCalledWith('company-1', 'ADVERTISING');
    });

    it('should throw ForbiddenException when advertising is not allowed', async () => {
      planAccess.can.mockResolvedValue(false);

      await expect(
        service.create('company-1', { name: 'Test Campaign' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when startAt >= endAt', async () => {
      planAccess.can.mockResolvedValue(true);

      await expect(
        service.create('company-1', {
          name: 'Test Campaign',
          startAt: '2026-01-02T00:00:00.000Z',
          endAt: '2026-01-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('activate', () => {
    it('should activate a DRAFT campaign', async () => {
      planAccess.can.mockResolvedValue(true);
      prisma.campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        companyId: 'company-1',
        status: 'DRAFT',
        startAt: null,
        endAt: null,
      });
      prisma.campaign.update.mockResolvedValue({});

      const result = await service.activate('company-1', 'campaign-1');

      expect(result).toBeDefined();
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { status: 'ACTIVE' },
      });
    });

    it('should throw BadRequestException when campaign is ACTIVE', async () => {
      planAccess.can.mockResolvedValue(true);
      prisma.campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        companyId: 'company-1',
        status: 'ACTIVE',
        startAt: null,
        endAt: null,
      });

      await expect(
        service.activate('company-1', 'campaign-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('pause', () => {
    it('should pause an ACTIVE campaign', async () => {
      planAccess.can.mockResolvedValue(true);
      prisma.campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        companyId: 'company-1',
        status: 'ACTIVE',
      });
      prisma.campaign.update.mockResolvedValue({});

      const result = await service.pause('company-1', 'campaign-1');

      expect(result).toBeDefined();
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { status: 'PAUSED' },
      });
    });

    it('should throw BadRequestException when campaign is DRAFT', async () => {
      planAccess.can.mockResolvedValue(true);
      prisma.campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        companyId: 'company-1',
        status: 'DRAFT',
      });

      await expect(
        service.pause('company-1', 'campaign-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
