import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ALERTS_QUEUE } from './alerts.constants.js';
import { AlertsService, AlertEvaluationContext } from './services/alerts.service.js';
import { AlertNotifierService } from './services/alert-notifier.service.js';

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
}
