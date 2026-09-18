import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IMPORTS_QUEUE } from '@/modules/imports/imports.constants.js';
import { SEARCH_QUEUE } from '@/modules/search/search.constants.js';
import { ALERTS_QUEUE } from '@/modules/alerts/alerts.constants.js';
import { EMBEDDING_QUEUE } from '@/modules/ai/ai.constants.js';

export type QueueCounts = Record<string, number>;

@Injectable()
export class QueueDepthService {
  private readonly logger = new Logger(QueueDepthService.name);

  constructor(
    @InjectQueue(IMPORTS_QUEUE) private readonly importsQueue: Queue,
    @InjectQueue(SEARCH_QUEUE) private readonly searchQueue: Queue,
    @InjectQueue(ALERTS_QUEUE) private readonly alertsQueue: Queue,
    @InjectQueue(EMBEDDING_QUEUE) private readonly embeddingsQueue: Queue,
  ) {}

  async sample(): Promise<Record<string, QueueCounts>> {
    const entries = await Promise.all([
      this.count(IMPORTS_QUEUE, this.importsQueue),
      this.count(SEARCH_QUEUE, this.searchQueue),
      this.count(ALERTS_QUEUE, this.alertsQueue),
      this.count(EMBEDDING_QUEUE, this.embeddingsQueue),
    ]);

    return Object.fromEntries(entries);
  }

  private async count(name: string, queue: Queue): Promise<[string, QueueCounts]> {
    try {
      const counts = await queue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
      );
      return [name, counts as QueueCounts];
    } catch (error) {
      this.logger.warn(`Failed to sample queue ${name}: ${(error as Error).message}`);
      return [name, {}];
    }
  }
}
