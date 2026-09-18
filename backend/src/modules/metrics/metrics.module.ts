import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MetricsController } from './metrics.controller.js';
import { QueueDepthService } from './queue-depth.service.js';
import { IMPORTS_QUEUE } from '@/modules/imports/imports.constants.js';
import { SEARCH_QUEUE } from '@/modules/search/search.constants.js';
import { ALERTS_QUEUE } from '@/modules/alerts/alerts.constants.js';
import { EMBEDDING_QUEUE } from '@/modules/ai/ai.constants.js';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: IMPORTS_QUEUE },
      { name: SEARCH_QUEUE },
      { name: ALERTS_QUEUE },
      { name: EMBEDDING_QUEUE },
    ),
  ],
  controllers: [MetricsController],
  providers: [QueueDepthService],
})
export class MetricsModule {}
