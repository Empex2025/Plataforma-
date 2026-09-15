import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SEARCH_QUEUE } from '../search.constants.js';
import { DEFAULT_JOB_OPTIONS } from '@/common/queue/job-options.js';

@Injectable()
export class SearchIndexQueue {
  private readonly logger = new Logger(SearchIndexQueue.name);

  constructor(
    @InjectQueue(SEARCH_QUEUE) private readonly queue: Queue,
  ) {}

  async indexProduct(productId: string): Promise<void> {
    await this.queue.add('index-product', { productId }, {
      ...DEFAULT_JOB_OPTIONS,
      jobId: `index-product-${productId}-${Date.now()}`,
    });
  }

  async indexProducts(productIds: string[]): Promise<void> {
    if (productIds.length === 0) return;
    await this.queue.add('index-products-batch', { productIds }, {
      ...DEFAULT_JOB_OPTIONS,
      jobId: `index-products-batch-${Date.now()}`,
    });
  }

  async indexStore(storeId: string): Promise<void> {
    await this.queue.add('index-store', { storeId }, {
      ...DEFAULT_JOB_OPTIONS,
      jobId: `index-store-${storeId}-${Date.now()}`,
    });
  }

  async removeProduct(productId: string): Promise<void> {
    await this.queue.add('delete-product', { productId }, {
      ...DEFAULT_JOB_OPTIONS,
      jobId: `delete-product-${productId}-${Date.now()}`,
    });
  }

  async removeStore(storeId: string): Promise<void> {
    await this.queue.add('delete-store', { storeId }, {
      ...DEFAULT_JOB_OPTIONS,
      jobId: `delete-store-${storeId}-${Date.now()}`,
    });
  }

  async reindexAllProducts(): Promise<string> {
    const job = await this.queue.add('reindex-all-products', {}, { ...DEFAULT_JOB_OPTIONS });
    return job.id as string;
  }

  async reindexAllStores(): Promise<string> {
    const job = await this.queue.add('reindex-all-stores', {}, { ...DEFAULT_JOB_OPTIONS });
    return job.id as string;
  }
}
