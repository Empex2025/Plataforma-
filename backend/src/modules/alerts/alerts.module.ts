import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller.js';
import { AlertsService } from './alerts.service.js';
import { EventsModule } from '../events/events.module.js';

@Module({
  imports: [EventsModule],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
