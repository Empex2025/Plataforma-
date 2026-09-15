import { Logger } from '@nestjs/common';
import { AI_PROVIDER_LOCAL, AI_PROVIDER_OPENAI } from '../ai.constants.js';
import type { AiConfig } from '../ai.types.js';
import type { EmbeddingProvider } from './embedding-provider.interface.js';
import { LocalDeterministicEmbeddingProvider } from './local-deterministic-embedding.provider.js';
import { OpenAiCompatibleEmbeddingProvider } from './openai-compatible-embedding.provider.js';

const logger = new Logger('EmbeddingProviderFactory');

/**
 * Builds the configured embedding provider.
 *
 * Returns null when AI is disabled or the configuration is incomplete. A null
 * provider is a first-class state: the recommendations pipeline then runs in
 * deterministic mode. It must never throw at request time.
 */
export function createEmbeddingProvider(config: AiConfig): EmbeddingProvider | null {
  if (!config.enabled) return null;

  switch (config.provider) {
    case AI_PROVIDER_LOCAL:
      return new LocalDeterministicEmbeddingProvider(config.model, config.dimension);

    case AI_PROVIDER_OPENAI:
      if (!config.baseUrl || !config.apiKey) {
        logger.warn('AI_PROVIDER=openai requires AI_BASE_URL and AI_API_KEY. AI disabled.');
        return null;
      }
      return new OpenAiCompatibleEmbeddingProvider({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        model: config.model,
        dimension: config.dimension,
        timeoutMs: config.timeoutMs,
      });

    default:
      if (config.provider) {
        logger.warn(`Unknown AI_PROVIDER "${config.provider}". AI disabled.`);
      }
      return null;
  }
}
