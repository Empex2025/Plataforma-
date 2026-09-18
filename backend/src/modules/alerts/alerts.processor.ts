import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ALERTS_QUEUE } from './alerts.constants.js';
import { AlertsService, AlertEvaluationContext } from './services/alerts.service.js';
import { AlertNotifierService } from './services/alert-notifier.service.js';
import { metricsRegistry } from '@/common/metrics/metrics.registry.js';
import { isFinalAttempt } from '@/common/queue/final-failure.js';

@Processor(ALERTS_QUEUE)
export class AlertsProcessor extends WorkerHost {
  private readonly logger = new Logger(AlertsProcessor.name);

  constructor(
    private readonly alertsService: AlertsService,
    private readonly notifier: AlertNotifierService,
  ) {
    super();
  }

  async process(job: Job<AlertEvaluationContext>): Promise<void> {
    const triggered = await this.alertsService.evaluateAlerts(job.data);

    for (const alert of triggered) {
      await this.notifier.notify(alert);
    }

    if (triggered.length > 0) {
      this.logger.log(`Job ${job.id}: ${triggered.length} alert(s) triggered`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(): void {
    metricsRegistry.recordQueueJob(ALERTS_QUEUE, 'succeeded');
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    metricsRegistry.recordQueueJob(ALERTS_QUEUE, 'failed');

    if (!isFinalAttempt(job)) return;

    metricsRegistry.recordFinalFailure(ALERTS_QUEUE);
    this.logger.error(
      `Alert job permanently failed after ${job?.attemptsMade ?? 0} attempt(s): ${job?.id}`,
      error,
    );
  }
}
