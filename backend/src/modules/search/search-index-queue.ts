import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SEARCH_QUEUE } from './search.constants.js';

@Injectable()
export class SearchIndexQueue {
  private readonly logger = new Logger(SearchIndexQueue.name);

  constructor(
    @InjectQueue(SEARCH_QUEUE) private readonly queue: Queue,
  ) {}

  async indexProduct(productId: string): Promise<void> {
    await this.queue.add('index-product', { productId }, {
      jobId: `index-product-${productId}-${Date.now()}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async indexStore(storeId: string): Promise<void> {
    await this.queue.add('index-store', { storeId }, {
      jobId: `index-store-${storeId}-${Date.now()}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async removeProduct(productId: string): Promise<void> {
    await this.queue.add('delete-product', { productId }, {
      jobId: `delete-product-${productId}-${Date.now()}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async removeStore(storeId: string): Promise<void> {
    await this.queue.add('delete-store', { storeId }, {
      jobId: `delete-store-${storeId}-${Date.now()}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async reindexAllProducts(): Promise<string> {
    const job = await this.queue.add('reindex-all-products', {}, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
    return job.id as string;
  }

  async reindexAllStores(): Promise<string> {
    const job = await this.queue.add('reindex-all-stores', {}, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
    return job.id as string;
  }
}
