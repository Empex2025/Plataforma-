import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ALERTS_QUEUE } from './alerts.constants.js';
import type { AlertEvaluationContext } from './services/alerts.service.js';
import { DEFAULT_JOB_OPTIONS } from '@/common/queue/job-options.js';

@Injectable()
export class AlertsQueue {
  private readonly logger = new Logger(AlertsQueue.name);

  constructor(@InjectQueue(ALERTS_QUEUE) private readonly queue: Queue) {}

  async evaluate(ctx: AlertEvaluationContext): Promise<void> {
    await this.queue.add('evaluate-alerts', ctx, {
      ...DEFAULT_JOB_OPTIONS,
      jobId: `evaluate-${ctx.storeId}-${ctx.productId}-${Date.now()}`,
    });
  }
}
