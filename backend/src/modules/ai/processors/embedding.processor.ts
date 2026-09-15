import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/db/prisma.service.js';
import { EMBEDDING_QUEUE } from '../ai.constants.js';
import type { EmbeddingEntityType } from '../ai.types.js';
import { EmbeddingService } from '../services/embedding.service.js';
import { EmbeddingQueue } from '../queues/embedding.queue.js';

const REINDEX_BATCH_SIZE = 100;

@Processor(EMBEDDING_QUEUE)
export class EmbeddingProcessor extends WorkerHost {
  private readonly logger = new Logger(EmbeddingProcessor.name);

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly embeddingQueue: EmbeddingQueue,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case 'embed-entity':
        return this.embeddingService.embedEntity(
          job.data.entityType as EmbeddingEntityType,
          job.data.entityId as string,
        );
      case 'embed-batch':
        return this.embeddingService.embedEntities(
          job.data.entityType as EmbeddingEntityType,
          job.data.entityIds as string[],
        );
      case 'embed-reindex':
        return this.reindex(job.data.entityType as EmbeddingEntityType);
      default:
        this.logger.warn(`Unknown embedding job: ${job.name}`);
        return null;
    }
  }

  private async reindex(entityType: EmbeddingEntityType): Promise<number> {
    let offset = 0;
    let processed = 0;

    for (;;) {
      const ids = await this.listActiveIds(entityType, offset);
      if (ids.length === 0) break;

      for (const id of ids) {
        await this.embeddingQueue.enqueueEntity(entityType, id);
      }

      processed += ids.length;
      offset += REINDEX_BATCH_SIZE;
    }

    this.logger.log(`Enqueued ${processed} ${entityType} embeddings for reindex`);
    return processed;
  }

  private async listActiveIds(entityType: EmbeddingEntityType, offset: number): Promise<string[]> {
    switch (entityType) {
      case 'product': {
        const rows = await this.prisma.product.findMany({
          where: { deletedAt: null, status: 'ACTIVE' },
          select: { id: true },
          skip: offset,
          take: REINDEX_BATCH_SIZE,
          orderBy: { id: 'asc' },
        });
        return rows.map((r) => r.id);
      }
      case 'store': {
        const rows = await this.prisma.store.findMany({
          where: { deletedAt: null, status: 'ACTIVE' },
          select: { id: true },
          skip: offset,
          take: REINDEX_BATCH_SIZE,
          orderBy: { id: 'asc' },
        });
        return rows.map((r) => r.id);
      }
      case 'offer': {
        const rows = await this.prisma.offer.findMany({
          select: { id: true },
          skip: offset,
          take: REINDEX_BATCH_SIZE,
          orderBy: { id: 'asc' },
        });
        return rows.map((r) => r.id);
      }
      default:
        return [];
    }
  }
}
