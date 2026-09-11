import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ImportsController } from './imports.controller.js';
import { ImportsService } from './imports.service.js';
import { ImportProcessor } from './imports.processor.js';
import { IMPORTS_QUEUE } from './imports.constants.js';
import { SearchModule } from '../search/search.module.js';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.VALKEY_HOST ?? 'localhost',
        port: parseInt(process.env.VALKEY_PORT ?? '6379', 10),
      },
    }),
    BullModule.registerQueue({ name: IMPORTS_QUEUE }),
    SearchModule,
  ],
  controllers: [ImportsController],
  providers: [ImportsService, ImportProcessor],
  exports: [ImportsService],
})
export class ImportsModule {}
