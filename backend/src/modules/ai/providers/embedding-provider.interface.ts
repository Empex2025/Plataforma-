export interface EmbeddingProvider {
  readonly id: string;
  readonly model: string;
  readonly dimension: number;

  /**
   * Generates a single embedding vector for the given text.
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Generates embedding vectors for a batch of texts. Order is preserved.
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}
