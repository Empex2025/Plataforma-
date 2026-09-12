import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ImportsController } from './imports.controller.js';
import { ImportsService } from './imports.service.js';
import { ImportProcessor } from './imports.processor.js';
import { IMPORTS_QUEUE } from './imports.constants.js';
import { SearchModule } from '../search/search.module.js';
import { PlansModule } from '../plans/plans.module.js';
import { AlertsModule } from '../alerts/alerts.module.js';

@Module({
  imports: [
    BullModule.registerQueue({ name: IMPORTS_QUEUE }),
    SearchModule,
    PlansModule,
    AlertsModule,
  ],
  controllers: [ImportsController],
  providers: [ImportsService, ImportProcessor],
  exports: [ImportsService],
})
export class ImportsModule {}
