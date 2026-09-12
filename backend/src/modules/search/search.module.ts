import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import { SearchIndexQueue } from './search-index-queue.js';
import { MeilisearchProvider } from './providers/meilisearch.provider.js';
import { ProductIndexer } from './indexers/product-indexer.js';
import { StoreIndexer } from './indexers/store-indexer.js';
import { SearchProcessor } from './search.processor.js';
import { SEARCH_QUEUE, SEARCH_PROVIDER } from './search.constants.js';
import { PrismaModule } from '../../db/prisma.module.js';
import { EventsModule } from '../events/events.module.js';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    BullModule.registerQueue({ name: SEARCH_QUEUE }),
  ],
  controllers: [SearchController],
  providers: [
    MeilisearchProvider,
    { provide: SEARCH_PROVIDER, useExisting: MeilisearchProvider },
    SearchService,
    SearchIndexQueue,
    ProductIndexer,
    StoreIndexer,
    SearchProcessor,
  ],
  exports: [SearchService, SearchIndexQueue, SEARCH_PROVIDER],
})
export class SearchModule {}
