import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/db/prisma.module.js';
import {
  AI_CONFIG,
  EMBEDDING_PROVIDER,
  EMBEDDING_QUEUE,
  VECTOR_STORE,
  VECTOR_STORE_PGVECTOR,
} from './ai.constants.js';
import type { AiConfig } from './ai.types.js';
import { buildAiConfig } from './config/ai-config.provider.js';
import { createEmbeddingProvider } from './providers/embedding-provider.factory.js';
import { ArrayVectorStore } from './vector-store/array-vector-store.js';
import { PgVectorStore } from './vector-store/pgvector-vector-store.js';
import { EmbeddingService } from './services/embedding.service.js';
import { EmbeddingQueue } from './queues/embedding.queue.js';
import { EmbeddingProcessor } from './processors/embedding.processor.js';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    BullModule.registerQueue({ name: EMBEDDING_QUEUE }),
  ],
  providers: [
    {
      provide: AI_CONFIG,
      inject: [ConfigService],
      useFactory: (config: ConfigService): AiConfig => buildAiConfig(config),
    },
    {
      provide: EMBEDDING_PROVIDER,
      inject: [AI_CONFIG],
      useFactory: (config: AiConfig) => createEmbeddingProvider(config),
    },
    ArrayVectorStore,
    PgVectorStore,
    {
      provide: VECTOR_STORE,
      inject: [AI_CONFIG, ArrayVectorStore, PgVectorStore],
      useFactory: async (
        config: AiConfig,
        arrayStore: ArrayVectorStore,
        pgStore: PgVectorStore,
      ) => {
        if (config.vectorStore === VECTOR_STORE_PGVECTOR && (await pgStore.isAvailable())) {
          return pgStore;
        }
        return arrayStore;
      },
    },
    EmbeddingService,
    EmbeddingQueue,
    EmbeddingProcessor,
  ],
  exports: [AI_CONFIG, EMBEDDING_PROVIDER, VECTOR_STORE, EmbeddingService, EmbeddingQueue],
})
export class AiModule {}
