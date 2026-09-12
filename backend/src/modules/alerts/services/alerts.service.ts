import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { EventsService } from '@/modules/events/events.service.js';
import { CreateAlertDto } from '../dto/create-alert.dto.js';
import { UpdateAlertDto } from '../dto/update-alert.dto.js';
import { AlertResponseDto } from '../dto/alert-response.dto.js';
import { EventType } from '@/generated/prisma/enums.js';

const DEDUP_INTERVAL_HOURS = 24;

export interface AlertEvaluationContext {
  storeId: string;
  productId: string;
  price?: number;
  quantity?: number;
}

export interface TriggeredAlert {
  alertId: string;
  userId: string;
  trigger: string;
  targetId: string;
  observedValue: number;
  threshold: string | null;
}

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
   * Evaluate the active alerts of a product against the current price and/or
   * stock quantity. Each alert is evaluated only when the value required by its
   * trigger is available.
   *
   * Uses an atomic UPDATE with a WHERE condition to prevent concurrent duplicate
   * triggers (24h dedup window). Returns only the alerts that actually fired.
   */
  async evaluateAlerts(ctx: AlertEvaluationContext): Promise<TriggeredAlert[]> {
    const alerts = await this.prisma.alert.findMany({
      where: {
        targetType: 'product',
        targetId: ctx.productId,
        active: true,
      },
    });

    const triggered: TriggeredAlert[] = [];
    const dedupThreshold = new Date(Date.now() - DEDUP_INTERVAL_HOURS * 60 * 60 * 1000);

    for (const alert of alerts) {
      const observedValue = this.resolveObservedValue(alert.trigger, ctx);
      if (observedValue === null) continue;

      if (!this.evaluateCondition(alert.trigger, observedValue, alert.threshold)) continue;

      // Atomic UPDATE: only update if lastTriggeredAt is NULL or older than dedup interval
      const result = await this.prisma.$executeRaw`
        UPDATE alerts
        SET last_triggered_at = NOW(),
            triggered_count = triggered_count + 1,
            last_observed_value = ${observedValue}::decimal,
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
          targetId: alert.targetId,
          observedValue,
          threshold: alert.threshold === null ? null : String(alert.threshold),
        });
      }
    }

    return triggered;
  }

  /**
   * Returns the observed value for the trigger, or null when the required value
   * was not provided in the evaluation context.
   */
  private resolveObservedValue(
    trigger: string,
    ctx: AlertEvaluationContext,
  ): number | null {
    switch (trigger) {
      case 'PRICE_BELOW':
      case 'PRICE_ABOVE':
        return ctx.price ?? null;
      case 'BACK_IN_STOCK':
        return ctx.quantity ?? null;
      case 'NEW_OFFER':
        return 0;
      default:
        return null;
    }
  }

  private evaluateCondition(trigger: string, currentValue: number, threshold: unknown): boolean {
    const hasThreshold = threshold !== null && threshold !== undefined;
    const thresholdNum = hasThreshold ? parseFloat(String(threshold)) : Number.NaN;

    switch (trigger) {
      case 'PRICE_BELOW':
        return hasThreshold && currentValue < thresholdNum;
      case 'PRICE_ABOVE':
        return hasThreshold && currentValue > thresholdNum;
      case 'BACK_IN_STOCK':
        return currentValue > 0;
      case 'NEW_OFFER':
        return true;
      default:
        return false;
    }
  }
}
