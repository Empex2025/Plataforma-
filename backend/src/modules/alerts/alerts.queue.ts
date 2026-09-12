import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ALERTS_QUEUE } from './alerts.constants.js';
import type { AlertEvaluationContext } from './alerts.service.js';

/**
 * Enqueues alert evaluation asynchronously so price/inventory writes are not
 * blocked by alert processing. Deduplication is enforced at the database level
 * by AlertsService (24h window), so duplicate jobs are harmless.
 */
@Injectable()
export class AlertsQueue {
  private readonly logger = new Logger(AlertsQueue.name);

  constructor(@InjectQueue(ALERTS_QUEUE) private readonly queue: Queue) {}

  async evaluate(ctx: AlertEvaluationContext): Promise<void> {
    await this.queue.add('evaluate-alerts', ctx, {
      jobId: `evaluate-${ctx.storeId}-${ctx.productId}-${Date.now()}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
