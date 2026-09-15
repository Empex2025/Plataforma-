import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_EMBEDDING_DIMENSION,
  DEFAULT_PROVIDER_TIMEOUT_MS,
  VECTOR_STORE_ARRAY,
} from '../ai.constants.js';
import type { AiConfig } from '../ai.types.js';

export function buildAiConfig(config: ConfigService): AiConfig {
  const enabled = String(config.get<string>('AI_ENABLED', 'false')).toLowerCase() === 'true';
  const rawDimension = config.get<string>('EMBEDDING_DIMENSION');
  const parsedDimension = rawDimension ? Number.parseInt(rawDimension, 10) : DEFAULT_EMBEDDING_DIMENSION;

  return {
    enabled,
    provider: config.get<string>('AI_PROVIDER') ?? null,
    model: config.get<string>('EMBEDDING_MODEL') ?? 'local-deterministic',
    dimension: Number.isFinite(parsedDimension) && parsedDimension > 0
      ? parsedDimension
      : DEFAULT_EMBEDDING_DIMENSION,
    baseUrl: config.get<string>('AI_BASE_URL') ?? null,
    apiKey: config.get<string>('AI_API_KEY') ?? null,
    vectorStore: config.get<string>('EMBEDDING_VECTOR_STORE', VECTOR_STORE_ARRAY),
    timeoutMs: DEFAULT_PROVIDER_TIMEOUT_MS,
  };
}
