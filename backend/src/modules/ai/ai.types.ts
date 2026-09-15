export type EmbeddingEntityType = 'product' | 'store' | 'offer';

export interface AiConfig {
  enabled: boolean;
  provider: string | null;
  model: string;
  dimension: number;
  baseUrl: string | null;
  apiKey: string | null;
  vectorStore: string;
  timeoutMs: number;
}
