import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AlertsController } from './alerts.controller.js';
import { AlertsService } from './services/alerts.service.js';
import { AlertsQueue } from './alerts.queue.js';
import { AlertsProcessor } from './alerts.processor.js';
import { AlertNotifierService } from './services/alert-notifier.service.js';
import { EventsModule } from '@/modules/events/events.module.js';
import { ALERTS_QUEUE } from './alerts.constants.js';

@Module({
  imports: [EventsModule, BullModule.registerQueue({ name: ALERTS_QUEUE })],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsQueue, AlertsProcessor, AlertNotifierService],
  exports: [AlertsService, AlertsQueue],
})
export class AlertsModule {}
