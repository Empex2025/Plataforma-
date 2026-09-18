import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ImportsController } from './imports.controller.js';
import { AdminImportsController } from './admin-imports.controller.js';
import { ImportsService } from './services/imports.service.js';
import { ImportReconciliationService } from './services/import-reconciliation.service.js';
import { ImportProcessor } from './processors/imports.processor.js';
import { IMPORTS_QUEUE } from './imports.constants.js';
import { SearchModule } from '@/modules/search/search.module.js';
import { PlansModule } from '@/modules/plans/plans.module.js';
import { AlertsModule } from '@/modules/alerts/alerts.module.js';
import { S3Storage } from './storage/s3.storage.js';
import { IMPORT_STORAGE } from './imports.types.js';

@Module({
  imports: [
    BullModule.registerQueue({ name: IMPORTS_QUEUE }),
    SearchModule,
    PlansModule,
    AlertsModule,
  ],
  controllers: [ImportsController, AdminImportsController],
  providers: [
    ImportsService,
    ImportReconciliationService,
    ImportProcessor,
    S3Storage,
    { provide: IMPORT_STORAGE, useExisting: S3Storage },
  ],
  exports: [ImportsService],
})
export class ImportsModule {}
