import type { EmbeddingProvider } from './embedding-provider.interface.js';

/**
 * Offline, provider-agnostic embedding implementation.
 *
 * It hashes tokens into a fixed-size bag-of-words vector and L2-normalizes it.
 * This produces deterministic vectors (same text => same vector), needs no
 * network access and is used for local development, tests and as the last
 * resort when no real provider is configured.
 *
 * It is intentionally simple: it exists so the semantic pipeline can run and be
 * verified without external dependencies. It is NOT a replacement for a real
 * embedding model.
 */
export class LocalDeterministicEmbeddingProvider implements EmbeddingProvider {
  readonly id = 'local';
  readonly model: string;
  readonly dimension: number;

  constructor(model = 'local-deterministic', dimension = 64) {
    this.model = model;
    this.dimension = dimension;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.embed(text);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.embed(text));
  }

  private embed(text: string): number[] {
    const vector = Array.from({ length: this.dimension }, () => 0);
    const tokens = this.tokenize(text);

    for (const token of tokens) {
      const index = hashToken(token) % this.dimension;
      vector[index] += 1;
    }

    return l2Normalize(vector);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9]+/g)
      .filter((token) => token.length > 1);
  }
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function l2Normalize(vector: number[]): number[] {
  let sum = 0;
  for (const value of vector) sum += value * value;
  if (sum === 0) return vector;
  const norm = Math.sqrt(sum);
  return vector.map((value) => value / norm);
}
