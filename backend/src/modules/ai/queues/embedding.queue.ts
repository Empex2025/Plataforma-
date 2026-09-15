import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EMBEDDING_QUEUE } from '../ai.constants.js';
import type { EmbeddingEntityType } from '../ai.types.js';
import { DEFAULT_JOB_OPTIONS } from '@/common/queue/job-options.js';

@Injectable()
export class EmbeddingQueue {
  constructor(@InjectQueue(EMBEDDING_QUEUE) private readonly queue: Queue) {}

  async enqueueEntity(entityType: EmbeddingEntityType, entityId: string): Promise<void> {
    await this.queue.add('embed-entity', { entityType, entityId }, DEFAULT_JOB_OPTIONS);
  }

  async enqueueBatch(entityType: EmbeddingEntityType, entityIds: string[]): Promise<void> {
    if (entityIds.length === 0) return;
    await this.queue.add('embed-batch', { entityType, entityIds }, DEFAULT_JOB_OPTIONS);
  }

  async reindexAll(entityType: EmbeddingEntityType): Promise<string> {
    const job = await this.queue.add('embed-reindex', { entityType }, {
      ...DEFAULT_JOB_OPTIONS,
      removeOnComplete: true,
    });
    return job.id as string;
  }
}
