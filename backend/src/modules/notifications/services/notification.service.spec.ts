import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service.js';
import { PrismaService } from '@/db/prisma.service.js';
import { NotificationType } from '../notification.types.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: {
    notification: {
      create: jest.Mock;
      createMany: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      count: jest.Mock;
    };
    favorite: { findMany: jest.Mock };
    userCompany: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      favorite: { findMany: jest.fn() },
      userCompany: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create notification when no dedup match', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);
      prisma.notification.create.mockResolvedValue({
        id: 'n-1', userId: 'u-1', type: 'PRICE_DROP', title: 'Preço caiu',
        message: 'Test', targetType: 'product', targetId: 'p-1', readAt: null, createdAt: new Date(),
      });

      const result = await service.create('u-1', NotificationType.PRICE_DROP, 'Preço caiu', 'Test', 'product', 'p-1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('n-1');
      expect(prisma.notification.create).toHaveBeenCalled();
    });

    it('should return null when dedup match exists', async () => {
      prisma.notification.findFirst.mockResolvedValue({ id: 'existing' });

      const result = await service.create('u-1', NotificationType.PRICE_DROP, 'Preço caiu', 'Test', 'product', 'p-1');
      expect(result).toBeNull();
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('should create notification without dedup when no targetType/targetId', async () => {
      prisma.notification.create.mockResolvedValue({
        id: 'n-2', userId: 'u-1', type: 'PRICE_DROP', title: 'Preço caiu',
        message: 'Test', targetType: null, targetId: null, readAt: null, createdAt: new Date(),
      });

      const result = await service.create('u-1', NotificationType.PRICE_DROP, 'Preço caiu', 'Test');
      expect(result).not.toBeNull();
      expect(prisma.notification.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('findUserNotifications', () => {
    it('should return paginated notifications', async () => {
      const notifications = [
        { id: 'n-1', userId: 'u-1', type: 'PRICE_DROP', title: 'T', message: 'M', targetType: 'product', targetId: 'p-1', readAt: null, createdAt: new Date() },
      ];
      prisma.notification.findMany.mockResolvedValue(notifications);
      prisma.notification.count.mockResolvedValue(1);

      const result = await service.findUserNotifications('u-1', 1, 20);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should enforce max limit of 50', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      const result = await service.findUserNotifications('u-1', 1, 100);
      expect(result.limit).toBe(50);
    });

    it('should enforce min page of 1', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      const result = await service.findUserNotifications('u-1', -5, 20);
      expect(result.page).toBe(1);
    });
  });

  describe('findUnread', () => {
    it('should return unread notifications with count', async () => {
      const unread = [
        { id: 'n-1', userId: 'u-1', type: 'PRICE_DROP', title: 'T', message: 'M', targetType: 'product', targetId: 'p-1', readAt: null, createdAt: new Date() },
      ];
      prisma.notification.findMany.mockResolvedValue(unread);
      prisma.notification.count.mockResolvedValue(1);

      const result = await service.findUnread('u-1');
      expect(result.count).toBe(1);
      expect(result.items).toHaveLength(1);
    });

    it('should return empty when no unread', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      const result = await service.findUnread('u-1');
      expect(result.count).toBe(0);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'n-1', userId: 'u-1', readAt: null,
      });
      prisma.notification.update.mockResolvedValue({});

      await service.markAsRead('u-1', 'n-1');
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n-1' },
        data: { readAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when notification not found', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead('u-1', 'n-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accessing another user notification', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'n-1', userId: 'other-user', readAt: null,
      });

      await expect(service.markAsRead('u-1', 'n-1')).rejects.toThrow(ForbiddenException);
    });

    it('should skip if already read', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'n-1', userId: 'u-1', readAt: new Date(),
      });

      await service.markAsRead('u-1', 'n-1');
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread as read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      await service.markAllAsRead('u-1');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u-1', readAt: null },
        data: { readAt: expect.any(Date) },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      prisma.notification.count.mockResolvedValue(3);

      const result = await service.getUnreadCount('u-1');
      expect(result).toBe(3);
    });
  });

  describe('notifyFavoriteUsers', () => {
    it('should create notifications for favorite users', async () => {
      prisma.favorite.findMany.mockResolvedValue([
        { userId: 'u-1' },
        { userId: 'u-2' },
      ]);
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await service.notifyFavoriteUsers(
        'PRODUCT', 'p-1', NotificationType.NEW_OFFER, 'Nova oferta', 'Test',
      );
      expect(result).toBe(2);
    });

    it('should skip users who already have recent notification', async () => {
      prisma.favorite.findMany.mockResolvedValue([
        { userId: 'u-1' },
        { userId: 'u-2' },
      ]);
      prisma.notification.findMany.mockResolvedValue([
        { userId: 'u-1' },
      ]);
      prisma.notification.createMany.mockResolvedValue({ count: 1 });

      const result = await service.notifyFavoriteUsers(
        'PRODUCT', 'p-1', NotificationType.NEW_OFFER, 'Nova oferta', 'Test',
      );
      expect(result).toBe(1);
    });

    it('should exclude all company members from notifications', async () => {
      prisma.favorite.findMany.mockResolvedValue([
        { userId: 'u-owner' },
        { userId: 'u-employee' },
        { userId: 'u-other' },
      ]);
      prisma.userCompany.findMany.mockResolvedValue([
        { userId: 'u-owner' },
        { userId: 'u-employee' },
      ]);
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.createMany.mockResolvedValue({ count: 1 });

      const result = await service.notifyFavoriteUsers(
        'PRODUCT', 'p-1', NotificationType.NEW_OFFER, 'Nova oferta', 'Test', ['comp-1'],
      );
      expect(result).toBe(1);
      expect(prisma.userCompany.findMany).toHaveBeenCalledWith({
        where: { companyId: { in: ['comp-1'] } },
        select: { userId: true },
      });

      const createCall = prisma.notification.createMany.mock.calls[0][0];
      expect(createCall.data).toHaveLength(1);
      expect(createCall.data[0].userId).toBe('u-other');
    });

    it('should return 0 when no favorites', async () => {
      prisma.favorite.findMany.mockResolvedValue([]);

      const result = await service.notifyFavoriteUsers(
        'PRODUCT', 'p-1', NotificationType.NEW_OFFER, 'Nova oferta', 'Test',
      );
      expect(result).toBe(0);
      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('should return 0 when all users excluded by company', async () => {
      prisma.favorite.findMany.mockResolvedValue([
        { userId: 'u-owner' },
      ]);
      prisma.userCompany.findMany.mockResolvedValue([
        { userId: 'u-owner' },
      ]);

      const result = await service.notifyFavoriteUsers(
        'PRODUCT', 'p-1', NotificationType.NEW_OFFER, 'Nova oferta', 'Test', ['comp-1'],
      );
      expect(result).toBe(0);
    });
  });
});
