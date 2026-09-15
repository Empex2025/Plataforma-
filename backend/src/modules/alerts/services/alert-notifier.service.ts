import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from '@/modules/notifications/services/notification.service.js';
import { NotificationType } from '@/modules/notifications/notification.types.js';
import type { TriggeredAlert } from './alerts.service.js';
import { PrismaService } from '@/db/prisma.service.js';

const TRIGGER_TO_TYPE: Record<string, NotificationType> = {
  PRICE_BELOW: NotificationType.PRICE_DROP,
  PRICE_ABOVE: NotificationType.PRICE_RISE,
  BACK_IN_STOCK: NotificationType.BACK_IN_STOCK,
  NEW_OFFER: NotificationType.NEW_OFFER,
};

@Injectable()
export class AlertNotifierService {
  private readonly logger = new Logger(AlertNotifierService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {}

  async notify(alert: TriggeredAlert): Promise<void> {
    const type = TRIGGER_TO_TYPE[alert.trigger];
    if (!type) {
      this.logger.warn(`Unknown trigger type: ${alert.trigger}`);
      return;
    }

    const product = await this.prisma.product.findUnique({
      where: { id: alert.targetId },
      select: { name: true },
    });

    const productName = product?.name ?? 'Produto';

    const { title, message } = this.buildContent(type, productName);

    await this.notificationService.create(
      alert.userId,
      type,
      title,
      message,
      'product',
      alert.targetId,
    );
  }

  private buildContent(
    type: NotificationType,
    productName: string,
  ): { title: string; message: string } {
    switch (type) {
      case NotificationType.PRICE_DROP:
        return {
          title: 'Preço caiu',
          message: `${productName} teve uma redução de preço.`,
        };
      case NotificationType.PRICE_RISE:
        return {
          title: 'Preço subiu',
          message: `${productName} teve um aumento de preço.`,
        };
      case NotificationType.BACK_IN_STOCK:
        return {
          title: 'Produto voltou ao estoque',
          message: `${productName} voltou ao estoque.`,
        };
      case NotificationType.NEW_OFFER:
        return {
          title: 'Nova oferta disponível',
          message: `Nova oferta disponível para ${productName}.`,
        };
      default:
        return {
          title: 'Atualização',
          message: `Há uma atualização para ${productName}.`,
        };
    }
  }
}
