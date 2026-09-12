import { Injectable, Logger } from '@nestjs/common';
import type { TriggeredAlert } from './alerts.service.js';

/**
 * Delivery channel for triggered alerts.
 *
 * Stub for now: it only logs. A real channel (e-mail/push/in-app notification)
 * will be plugged in later without changing the evaluation flow.
 */
@Injectable()
export class AlertNotifierService {
  private readonly logger = new Logger(AlertNotifierService.name);

  async notify(alert: TriggeredAlert): Promise<void> {
    this.logger.log(
      `Alert triggered: ${alert.trigger} for user ${alert.userId} ` +
        `(product ${alert.targetId}, observed ${alert.observedValue})`,
    );
  }
}
