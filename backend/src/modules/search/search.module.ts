import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import { SearchIndexQueue } from './search-index-queue.js';
import { MeilisearchProvider } from './providers/meilisearch.provider.js';
import { ProductIndexer } from './indexers/product-indexer.js';
import { StoreIndexer } from './indexers/store-indexer.js';
import { SearchProcessor } from './search.processor.js';
import { SEARCH_QUEUE } from './search.constants.js';
import { PrismaModule } from '../../db/prisma.module.js';

const searchProviderFactory = {
  provide: 'ISearchProvider',
  useFactory: () => {
    return new MeilisearchProvider();
  },
};

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: SEARCH_QUEUE }),
  ],
  controllers: [SearchController],
  providers: [
    searchProviderFactory,
    SearchService,
    SearchIndexQueue,
    ProductIndexer,
    StoreIndexer,
    SearchProcessor,
  ],
  exports: [SearchService, SearchIndexQueue],
})
export class SearchModule {}
