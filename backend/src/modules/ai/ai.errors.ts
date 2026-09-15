export class EmbeddingDimensionError extends Error {
  constructor(expected: number, received: number) {
    super(`Embedding dimension mismatch: configured ${expected}, provider returned ${received}`);
    this.name = 'EmbeddingDimensionError';
  }
}

export class EmbeddingUnavailableError extends Error {
  constructor(reason: string) {
    super(`Embeddings unavailable: ${reason}`);
    this.name = 'EmbeddingUnavailableError';
  }
}
