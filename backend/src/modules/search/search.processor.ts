import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../db/prisma.service.js';
import { SEARCH_QUEUE, SEARCH_PROVIDER, REINDEX_BATCH_SIZE } from './search.constants.js';
import type { ISearchProvider } from './providers/search-provider.interface.js';
import { ProductIndexer } from './indexers/product-indexer.js';
import { StoreIndexer } from './indexers/store-indexer.js';

@Processor(SEARCH_QUEUE)
export class SearchProcessor extends WorkerHost {
  private readonly logger = new Logger(SearchProcessor.name);

  constructor(
    private readonly productIndexer: ProductIndexer,
    private readonly storeIndexer: StoreIndexer,
    private readonly prisma: PrismaService,
    @Inject(SEARCH_PROVIDER) private readonly provider: ISearchProvider,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing search job: ${job.name} (${job.id})`);

    try {
      switch (job.name) {
        case 'index-product':
          await this.indexProduct(job);
          break;
        case 'index-store':
          await this.indexStore(job);
          break;
        case 'delete-product':
          await this.provider.deleteProduct(job.data.productId);
          break;
        case 'delete-store':
          await this.provider.deleteStore(job.data.storeId);
          break;
        case 'reindex-all-products':
          await this.reindexAllProducts(job);
          break;
        case 'reindex-all-stores':
          await this.reindexAllStores(job);
          break;
        default:
          this.logger.warn(`Unknown job name: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(`Search job failed: ${job.name} (${job.id})`, error);
      throw error;
    }
  }

  private async indexProduct(job: Job): Promise<void> {
    const { productId } = job.data;
    const doc = await this.productIndexer.buildDocument(productId);
    if (doc) {
      await this.provider.indexProduct(doc);
    }
  }

  private async indexStore(job: Job): Promise<void> {
    const { storeId } = job.data;
    const doc = await this.storeIndexer.buildDocument(storeId);
    if (doc) {
      await this.provider.indexStore(doc);
    }
  }

  private async reindexAllProducts(job: Job): Promise<void> {
    let offset = 0;
    let total = 0;

    while (true) {
      const products = await this.prisma.product.findMany({
        where: { deletedAt: null, status: 'ACTIVE' },
        select: { id: true },
        skip: offset,
        take: REINDEX_BATCH_SIZE,
      });

      if (products.length === 0) break;

      const docs = await this.productIndexer.buildDocuments(products.map(p => p.id));
      if (docs.length > 0) {
        await this.provider.reindexProducts(docs);
      }

      total += docs.length;
      offset += products.length;
      await job.updateProgress(total);

      this.logger.log(`Reindexed ${total} products...`);
    }

    this.logger.log(`Reindex products completed: ${total} total`);
  }

  private async reindexAllStores(job: Job): Promise<void> {
    let offset = 0;
    let total = 0;

    while (true) {
      const stores = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM stores WHERE deleted_at IS NULL AND status = 'ACTIVE'
        LIMIT ${REINDEX_BATCH_SIZE} OFFSET ${offset}
      `;

      if (stores.length === 0) break;

      const docs = await this.storeIndexer.buildDocuments(stores.map(s => s.id));
      if (docs.length > 0) {
        await this.provider.reindexStores(docs);
      }

      total += docs.length;
      offset += stores.length;
      await job.updateProgress(total);

      this.logger.log(`Reindexed ${total} stores...`);
    }

    this.logger.log(`Reindex stores completed: ${total} total`);
  }
}
