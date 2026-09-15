import { createEmbeddingProvider } from './embedding-provider.factory.js';
import { LocalDeterministicEmbeddingProvider } from './local-deterministic-embedding.provider.js';
import { OpenAiCompatibleEmbeddingProvider } from './openai-compatible-embedding.provider.js';
import type { AiConfig } from '../ai.types.js';

function makeConfig(overrides: Partial<AiConfig> = {}): AiConfig {
  return {
    enabled: true,
    provider: 'local',
    model: 'local-deterministic',
    dimension: 64,
    baseUrl: null,
    apiKey: null,
    vectorStore: 'array',
    timeoutMs: 1000,
    ...overrides,
  };
}

describe('createEmbeddingProvider', () => {
  it('returns null when AI is disabled', () => {
    expect(createEmbeddingProvider(makeConfig({ enabled: false }))).toBeNull();
  });

  it('creates the local provider', () => {
    const provider = createEmbeddingProvider(makeConfig({ provider: 'local' }));
    expect(provider).toBeInstanceOf(LocalDeterministicEmbeddingProvider);
  });

  it('creates the openai-compatible provider when fully configured', () => {
    const provider = createEmbeddingProvider(
      makeConfig({ provider: 'openai', baseUrl: 'https://api.example.com/v1', apiKey: 'secret' }),
    );
    expect(provider).toBeInstanceOf(OpenAiCompatibleEmbeddingProvider);
  });

  it('returns null for openai without base url or api key', () => {
    expect(createEmbeddingProvider(makeConfig({ provider: 'openai', apiKey: 'secret' }))).toBeNull();
    expect(createEmbeddingProvider(makeConfig({ provider: 'openai', baseUrl: 'https://x/v1' }))).toBeNull();
  });

  it('returns null for unknown providers', () => {
    expect(createEmbeddingProvider(makeConfig({ provider: 'mystery' }))).toBeNull();
  });

  it('returns null when provider is missing while enabled', () => {
    expect(createEmbeddingProvider(makeConfig({ provider: null }))).toBeNull();
  });
});
