import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service.js';
import { EventsService } from '../events/events.service.js';
import { CreateAlertDto } from './dto/create-alert.dto.js';
import { UpdateAlertDto } from './dto/update-alert.dto.js';
import { AlertResponseDto } from './dto/alert-response.dto.js';
import { EventType } from '../../generated/prisma/enums.js';

const DEDUP_INTERVAL_HOURS = 24;

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  async create(userId: string, dto: CreateAlertDto): Promise<AlertResponseDto> {
    const alert = await this.prisma.alert.create({
      data: {
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        trigger: dto.trigger,
        threshold: dto.threshold ?? null,
      },
    });

    this.eventsService.track(
      { type: EventType.ALERT_CREATED, targetType: dto.targetType, targetId: dto.targetId },
      userId,
    ).catch((err) => this.logger.warn(`Failed to track alert event: ${err}`));

    return AlertResponseDto.fromPlain(alert as unknown as Record<string, unknown>);
  }

  async findAll(userId: string): Promise<AlertResponseDto[]> {
    const alerts = await this.prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return alerts.map((a) => AlertResponseDto.fromPlain(a as unknown as Record<string, unknown>));
  }

  async update(userId: string, alertId: string, dto: UpdateAlertDto): Promise<AlertResponseDto> {
    const alert = await this.prisma.alert.findUnique({ where: { id: alertId } });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (alert.userId !== userId) {
      throw new ForbiddenException('Cannot update another user\'s alert');
    }

    const updated = await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        ...(dto.threshold !== undefined && { threshold: dto.threshold }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });

    return AlertResponseDto.fromPlain(updated as unknown as Record<string, unknown>);
  }

  async remove(userId: string, alertId: string): Promise<void> {
    const alert = await this.prisma.alert.findUnique({ where: { id: alertId } });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (alert.userId !== userId) {
      throw new ForbiddenException('Cannot delete another user\'s alert');
    }

    await this.prisma.alert.delete({ where: { id: alertId } });
  }

  /**
   * Evaluate alerts for a given product/store combination.
   * Uses atomic UPDATE with WHERE condition to prevent concurrent duplicate triggers.
   *
   * Returns only alerts that were actually triggered (not skipped due to dedup).
   */
  async evaluateAlerts(
    storeId: string,
    productId: string,
    currentValue: number,
  ): Promise<{ alertId: string; userId: string; trigger: string }[]> {
    const alerts = await this.prisma.alert.findMany({
      where: {
        targetType: 'product',
        targetId: productId,
        active: true,
      },
    });

    const triggered: { alertId: string; userId: string; trigger: string }[] = [];
    const now = new Date();
    const dedupThreshold = new Date(now.getTime() - DEDUP_INTERVAL_HOURS * 60 * 60 * 1000);

    for (const alert of alerts) {
      const conditionMet = this.evaluateCondition(alert.trigger, currentValue, alert.threshold);

      if (!conditionMet) continue;

      // Atomic UPDATE: only update if lastTriggeredAt is NULL or older than dedup interval
      const result = await this.prisma.$executeRaw`
        UPDATE alerts
        SET last_triggered_at = NOW(),
            triggered_count = triggered_count + 1,
            last_observed_value = ${currentValue}::decimal,
            updated_at = NOW()
        WHERE id = ${alert.id}::uuid
          AND active = true
          AND (last_triggered_at IS NULL OR last_triggered_at < ${dedupThreshold}::timestamp)
      `;

      if (result === 1) {
        triggered.push({
          alertId: alert.id,
          userId: alert.userId,
          trigger: alert.trigger,
        });
      }
    }

    return triggered;
  }

  private evaluateCondition(trigger: string, currentValue: number, threshold: unknown): boolean {
    if (threshold === null || threshold === undefined) return true;

    const thresholdStr = typeof threshold === 'string' ? threshold : String(threshold);
    const thresholdNum = parseFloat(thresholdStr);

    switch (trigger) {
      case 'PRICE_BELOW':
        return currentValue < thresholdNum;
      case 'PRICE_ABOVE':
        return currentValue > thresholdNum;
      case 'BACK_IN_STOCK':
        return currentValue > 0;
      case 'NEW_OFFER':
        return true;
      default:
        return false;
    }
  }
}
