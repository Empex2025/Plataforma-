export interface EmbeddingProvider {
  readonly id: string;
  readonly model: string;
  readonly dimension: number;

  generateEmbedding(text: string): Promise<number[]>;

  generateEmbeddings(texts: string[]): Promise<number[][]>;
}
