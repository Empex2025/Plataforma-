import { LocalDeterministicEmbeddingProvider } from './local-deterministic-embedding.provider.js';
import { cosineSimilarity } from '../vector-store/cosine.js';

describe('LocalDeterministicEmbeddingProvider', () => {
  const provider = new LocalDeterministicEmbeddingProvider('local-deterministic', 32);

  it('exposes the configured model and dimension', () => {
    expect(provider.model).toBe('local-deterministic');
    expect(provider.dimension).toBe(32);
  });

  it('produces vectors with the configured dimension', async () => {
    const vector = await provider.generateEmbedding('tênis de corrida');
    expect(vector).toHaveLength(32);
  });

  it('is deterministic for the same text', async () => {
    const a = await provider.generateEmbedding('arroz integral');
    const b = await provider.generateEmbedding('arroz integral');
    expect(a).toEqual(b);
  });

  it('produces higher similarity for related text', async () => {
    const base = await provider.generateEmbedding('tênis de corrida confortável');
    const related = await provider.generateEmbedding('tênis para corrida');
    const unrelated = await provider.generateEmbedding('arroz integral pacote');

    const relatedScore = cosineSimilarity(base, related);
    const unrelatedScore = cosineSimilarity(base, unrelated);

    expect(relatedScore).toBeGreaterThan(unrelatedScore);
  });

  it('generates embeddings in batch preserving order', async () => {
    const single = await provider.generateEmbedding('camiseta azul');
    const batch = await provider.generateEmbeddings(['camiseta azul', 'calça preta']);
    expect(batch).toHaveLength(2);
    expect(batch[0]).toEqual(single);
  });

  it('returns a zero vector for empty text', async () => {
    const vector = await provider.generateEmbedding('   ');
    expect(vector.every((value) => value === 0)).toBe(true);
  });
});
