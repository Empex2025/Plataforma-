import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { NotificationType, NOTIFICATION_DEDUP_HOURS } from '../notification.types.js';
import { NotificationResponseDto } from '../dto/notification-response.dto.js';
import { NotificationsListResponseDto } from '../dto/notifications-list.dto.js';
import { UnreadResponseDto } from '../dto/unread-response.dto.js';

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    targetType?: string,
    targetId?: string,
  ): Promise<NotificationResponseDto | null> {
    if (targetType && targetId) {
      const dedupThreshold = new Date(Date.now() - NOTIFICATION_DEDUP_HOURS * 60 * 60 * 1000);
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId,
          type,
          targetType,
          targetId,
          createdAt: { gte: dedupThreshold },
        },
        select: { id: true },
      });

      if (existing) {
        return null;
      }
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        targetType: targetType ?? null,
        targetId: targetId ?? null,
      },
    });

    return NotificationResponseDto.fromPlain(notification as unknown as Record<string, unknown>);
  }

  async findUserNotifications(
    userId: string,
    page = 1,
    limit = DEFAULT_PAGE_LIMIT,
  ): Promise<NotificationsListResponseDto> {
    const safeLimit = Math.min(Math.max(1, limit), MAX_PAGE_LIMIT);
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      items: items.map((n) => NotificationResponseDto.fromPlain(n as unknown as Record<string, unknown>)),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async findUnread(userId: string): Promise<UnreadResponseDto> {
    const [items, count] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, readAt: null },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return {
      count,
      items: items.map((n) => NotificationResponseDto.fromPlain(n as unknown as Record<string, unknown>)),
    };
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Não é possível acessar a notificação de outro usuário');
    }

    if (notification.readAt) return;

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async notifyFavoriteUsers(
    targetType: 'PRODUCT' | 'STORE',
    targetId: string,
    type: NotificationType,
    title: string,
    message: string,
    excludeCompanyIds?: string[],
  ): Promise<number> {
    const favorites = await this.prisma.favorite.findMany({
      where: { targetType, targetId },
      select: { userId: true },
    });

    if (favorites.length === 0) return 0;

    let excludedUserIds: string[] = [];
    if (excludeCompanyIds && excludeCompanyIds.length > 0) {
      const members = await this.prisma.userCompany.findMany({
        where: { companyId: { in: excludeCompanyIds } },
        select: { userId: true },
      });
      excludedUserIds = members.map((m) => m.userId);
    }

    const excludedSet = new Set(excludedUserIds);
    const dedupThreshold = new Date(Date.now() - NOTIFICATION_DEDUP_HOURS * 60 * 60 * 1000);
    const candidateUserIds = favorites
      .map((f) => f.userId)
      .filter((uid) => !excludedSet.has(uid));

    if (candidateUserIds.length === 0) return 0;

    const existing = await this.prisma.notification.findMany({
      where: {
        userId: { in: candidateUserIds },
        type,
        targetType,
        targetId,
        createdAt: { gte: dedupThreshold },
      },
      select: { userId: true },
    });

    const existingUserIds = new Set(existing.map((n) => n.userId));
    const newUserIds = candidateUserIds.filter((uid) => !existingUserIds.has(uid));

    if (newUserIds.length === 0) return 0;

    await this.prisma.notification.createMany({
      data: newUserIds.map((userId) => ({
        userId,
        type,
        title,
        message,
        targetType,
        targetId,
      })),
    });

    return newUserIds.length;
  }
}
