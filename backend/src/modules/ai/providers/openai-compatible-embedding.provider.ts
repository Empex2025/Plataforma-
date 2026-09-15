import { Logger } from '@nestjs/common';
import type { EmbeddingProvider } from './embedding-provider.interface.js';

export interface OpenAiCompatibleOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  dimension: number;
  timeoutMs: number;
}

interface OpenAiEmbeddingResponse {
  data?: Array<{ index?: number; embedding?: number[] }>;
}

/**
 * HTTP adapter for any OpenAI-compatible embeddings endpoint.
 *
 * The endpoint is fully configurable through environment variables, so it works
 * with OpenAI, DeepSeek, or any other provider exposing the same contract.
 * Domain code never talks to this class directly: it is injected through the
 * EmbeddingProvider abstraction.
 */
export class OpenAiCompatibleEmbeddingProvider implements EmbeddingProvider {
  readonly id = 'openai';
  readonly model: string;
  readonly dimension: number;
  private readonly logger = new Logger(OpenAiCompatibleEmbeddingProvider.name);

  constructor(private readonly options: OpenAiCompatibleOptions) {
    this.model = options.model;
    this.dimension = options.dimension;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const [vector] = await this.generateEmbeddings([text]);
    return vector;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const response = await fetch(`${this.options.baseUrl.replace(/\/$/, '')}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({ model: this.options.model, input: texts }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Embedding provider responded with status ${response.status}`);
      }

      const payload = (await response.json()) as OpenAiEmbeddingResponse;
      const data = Array.isArray(payload.data) ? payload.data : [];

      if (data.length !== texts.length) {
        throw new Error(
          `Embedding provider returned ${data.length} vectors for ${texts.length} inputs`,
        );
      }

      const ordered = [...data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      const vectors = ordered.map((item) => item.embedding);

      if (vectors.some((vector) => !Array.isArray(vector))) {
        throw new Error('Embedding provider returned an invalid vector payload');
      }

      return vectors as number[][];
    } catch (error) {
      this.logger.warn(`Embedding provider request failed: ${(error as Error).message}`);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
