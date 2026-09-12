import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ImportsController } from './imports.controller.js';
import { ImportsService } from './imports.service.js';
import { ImportProcessor } from './imports.processor.js';
import { IMPORTS_QUEUE } from './imports.constants.js';
import { SearchModule } from '../search/search.module.js';
import { PlansModule } from '../plans/plans.module.js';
import { AlertsModule } from '../alerts/alerts.module.js';
import { S3Storage } from './storage/s3.storage.js';
import { IMPORT_STORAGE } from './imports.types.js';

@Module({
  imports: [
    BullModule.registerQueue({ name: IMPORTS_QUEUE }),
    SearchModule,
    PlansModule,
    AlertsModule,
  ],
  controllers: [ImportsController],
  providers: [
    ImportsService,
    ImportProcessor,
    S3Storage,
    { provide: IMPORT_STORAGE, useExisting: S3Storage },
  ],
  exports: [ImportsService],
})
export class ImportsModule {}
