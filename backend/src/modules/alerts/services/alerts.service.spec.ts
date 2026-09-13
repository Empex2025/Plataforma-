import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service.js';
import { PrismaService } from '@/db/prisma.service.js';
import { EventsService } from '@/modules/events/events.service.js';
import { PlanAccessService } from '@/modules/plans/services/plan-access.service.js';
import { AlertTriggerType } from '@/generated/prisma/enums.js';
import { ForbiddenException } from '@nestjs/common';

describe('AlertsService', () => {
  let service: AlertsService;
  let prisma: {
    alert: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock; delete: jest.Mock };
    userCompany: { findFirst: jest.Mock };
    $executeRaw: jest.Mock;
  };
  let eventsService: { track: jest.Mock };
  let planAccess: { can: jest.Mock };

  beforeEach(async () => {
    prisma = {
      alert: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
      userCompany: { findFirst: jest.fn() },
      $executeRaw: jest.fn(),
    };
    eventsService = { track: jest.fn() };
    planAccess = { can: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsService, useValue: eventsService },
        { provide: PlanAccessService, useValue: planAccess },
      ],
    }).compile();

    service = module.get(AlertsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create alert and track event when plan allows', async () => {
      const alert = { id: 'alert-1', userId: 'user-1', targetType: 'product', targetId: 'prod-1', trigger: 'PRICE_BELOW', threshold: '20.00', active: true, lastTriggeredAt: null, triggeredCount: 0, lastObservedValue: null, createdAt: new Date(), updatedAt: new Date() };
      prisma.userCompany.findFirst.mockResolvedValue({ companyId: 'comp-1' });
      planAccess.can.mockResolvedValue(true);
      prisma.alert.create.mockResolvedValue(alert);
      eventsService.track.mockResolvedValue(undefined);

      const result = await service.create('user-1', {
        targetType: 'product',
        targetId: 'prod-1',
        trigger: AlertTriggerType.PRICE_BELOW,
        threshold: '20.00',
      });

      expect(result.id).toBe('alert-1');
      expect(prisma.alert.create).toHaveBeenCalled();
      expect(eventsService.track).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when plan does not allow alerts', async () => {
      prisma.userCompany.findFirst.mockResolvedValue({ companyId: 'comp-1' });
      planAccess.can.mockResolvedValue(false);

      await expect(
        service.create('user-1', {
          targetType: 'product',
          targetId: 'prod-1',
          trigger: AlertTriggerType.PRICE_BELOW,
          threshold: '20.00',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user has no company', async () => {
      prisma.userCompany.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          targetType: 'product',
          targetId: 'prod-1',
          trigger: AlertTriggerType.PRICE_BELOW,
          threshold: '20.00',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('evaluateAlerts', () => {
    it('should trigger alert when condition met and dedup allows', async () => {
      const alerts = [
        { id: 'alert-1', userId: 'user-1', targetType: 'product', targetId: 'prod-1', trigger: 'PRICE_BELOW', threshold: '20.00', active: true, lastTriggeredAt: null, triggeredCount: 0 },
      ];
      prisma.alert.findMany.mockResolvedValue(alerts);
      prisma.$executeRaw.mockResolvedValue(1);

      const result = await service.evaluateAlerts({ storeId: 'store-1', productId: 'prod-1', price: 15.00 });

      expect(result).toHaveLength(1);
      expect(result[0].alertId).toBe('alert-1');
    });

    it('should skip alert when condition not met', async () => {
      const alerts = [
        { id: 'alert-1', userId: 'user-1', targetType: 'product', targetId: 'prod-1', trigger: 'PRICE_BELOW', threshold: '20.00', active: true, lastTriggeredAt: null, triggeredCount: 0 },
      ];
      prisma.alert.findMany.mockResolvedValue(alerts);

      const result = await service.evaluateAlerts({ storeId: 'store-1', productId: 'prod-1', price: 25.00 });

      expect(result).toHaveLength(0);
    });

    it('should skip alert when dedup prevents trigger', async () => {
      const alerts = [
        { id: 'alert-1', userId: 'user-1', targetType: 'product', targetId: 'prod-1', trigger: 'PRICE_BELOW', threshold: '20.00', active: true, lastTriggeredAt: new Date(), triggeredCount: 1 },
      ];
      prisma.alert.findMany.mockResolvedValue(alerts);
      prisma.$executeRaw.mockResolvedValue(0);

      const result = await service.evaluateAlerts({ storeId: 'store-1', productId: 'prod-1', price: 15.00 });

      expect(result).toHaveLength(0);
    });

    it('should skip price alerts when no price is provided', async () => {
      const alerts = [
        { id: 'alert-1', userId: 'user-1', targetType: 'product', targetId: 'prod-1', trigger: 'PRICE_BELOW', threshold: '20.00', active: true, lastTriggeredAt: null, triggeredCount: 0 },
      ];
      prisma.alert.findMany.mockResolvedValue(alerts);

      const result = await service.evaluateAlerts({ storeId: 'store-1', productId: 'prod-1', quantity: 5 });

      expect(result).toHaveLength(0);
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('should trigger BACK_IN_STOCK when quantity is positive', async () => {
      const alerts = [
        { id: 'alert-2', userId: 'user-1', targetType: 'product', targetId: 'prod-1', trigger: 'BACK_IN_STOCK', threshold: null, active: true, lastTriggeredAt: null, triggeredCount: 0 },
      ];
      prisma.alert.findMany.mockResolvedValue(alerts);
      prisma.$executeRaw.mockResolvedValue(1);

      const result = await service.evaluateAlerts({ storeId: 'store-1', productId: 'prod-1', quantity: 3 });

      expect(result).toHaveLength(1);
      expect(result[0].trigger).toBe('BACK_IN_STOCK');
    });

    it('should not trigger BACK_IN_STOCK when quantity is zero', async () => {
      const alerts = [
        { id: 'alert-2', userId: 'user-1', targetType: 'product', targetId: 'prod-1', trigger: 'BACK_IN_STOCK', threshold: null, active: true, lastTriggeredAt: null, triggeredCount: 0 },
      ];
      prisma.alert.findMany.mockResolvedValue(alerts);

      const result = await service.evaluateAlerts({ storeId: 'store-1', productId: 'prod-1', quantity: 0 });

      expect(result).toHaveLength(0);
    });
  });
});
