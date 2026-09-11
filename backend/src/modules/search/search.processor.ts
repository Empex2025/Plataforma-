import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../db/prisma.service.js';
import { SEARCH_QUEUE, REINDEX_BATCH_SIZE } from './search.constants.js';
import { MeilisearchProvider } from './providers/meilisearch.provider.js';
import { ProductIndexer } from './indexers/product-indexer.js';
import { StoreIndexer } from './indexers/store-indexer.js';

@Processor(SEARCH_QUEUE)
export class SearchProcessor extends WorkerHost {
  private readonly logger = new Logger(SearchProcessor.name);

  constructor(
    private readonly productIndexer: ProductIndexer,
    private readonly storeIndexer: StoreIndexer,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing search job: ${job.name} (${job.id})`);

    const provider = new MeilisearchProvider();

    try {
      switch (job.name) {
        case 'index-product':
          await this.indexProduct(job, provider);
          break;
        case 'index-store':
          await this.indexStore(job, provider);
          break;
        case 'delete-product':
          await this.deleteProduct(job, provider);
          break;
        case 'delete-store':
          await this.deleteStore(job, provider);
          break;
        case 'reindex-all-products':
          await this.reindexAllProducts(job, provider);
          break;
        case 'reindex-all-stores':
          await this.reindexAllStores(job, provider);
          break;
        default:
          this.logger.warn(`Unknown job name: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(`Search job failed: ${job.name} (${job.id})`, error);
      throw error;
    }
  }

  private async indexProduct(job: Job, provider: MeilisearchProvider): Promise<void> {
    const { productId } = job.data;
    const doc = await this.productIndexer.buildDocument(productId);
    if (doc) {
      await provider.indexProduct(doc);
    }
  }

  private async indexStore(job: Job, provider: MeilisearchProvider): Promise<void> {
    const { storeId } = job.data;
    const doc = await this.storeIndexer.buildDocument(storeId);
    if (doc) {
      await provider.indexStore(doc);
    }
  }

  private async deleteProduct(job: Job, provider: MeilisearchProvider): Promise<void> {
    await provider.deleteProduct(job.data.productId);
  }

  private async deleteStore(job: Job, provider: MeilisearchProvider): Promise<void> {
    await provider.deleteStore(job.data.storeId);
  }

  private async reindexAllProducts(job: Job, provider: MeilisearchProvider): Promise<void> {
    const prisma = new PrismaService();
    await prisma.$connect();

    try {
      let offset = 0;
      let total = 0;

      while (true) {
        const products = await prisma.product.findMany({
          where: { deletedAt: null, status: 'ACTIVE' },
          select: { id: true },
          skip: offset,
          take: REINDEX_BATCH_SIZE,
        });

        if (products.length === 0) break;

        const docs = await this.productIndexer.buildDocuments(products.map(p => p.id));
        if (docs.length > 0) {
          await provider.reindexProducts(docs);
        }

        total += docs.length;
        offset += products.length;
        await job.updateProgress(total);

        this.logger.log(`Reindexed ${total} products...`);
      }

      this.logger.log(`Reindex products completed: ${total} total`);
    } finally {
      await prisma.$disconnect();
    }
  }

  private async reindexAllStores(job: Job, provider: MeilisearchProvider): Promise<void> {
    const prisma = new PrismaService();
    await prisma.$connect();

    try {
      let offset = 0;
      let total = 0;

      while (true) {
        const stores = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM stores WHERE deleted_at IS NULL AND status = 'ACTIVE'
          LIMIT ${REINDEX_BATCH_SIZE} OFFSET ${offset}
        `;

        if (stores.length === 0) break;

        const docs = await this.storeIndexer.buildDocuments(stores.map(s => s.id));
        if (docs.length > 0) {
          await provider.reindexStores(docs);
        }

        total += docs.length;
        offset += stores.length;
        await job.updateProgress(total);

        this.logger.log(`Reindexed ${total} stores...`);
      }

      this.logger.log(`Reindex stores completed: ${total} total`);
    } finally {
      await prisma.$disconnect();
    }
  }
}
