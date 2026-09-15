/**
 * Cosine similarity between two vectors. Returns a value in [-1, 1] (0 when
 * either vector is empty or lengths differ).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Normalizes a cosine similarity to the [0, 1] range used by the hybrid score.
 * Negative similarities (opposite directions) collapse to 0.
 *
 * Cosine is the chosen metric because it is scale-invariant and directly
 * supported by pgvector (`<=>` operator).
 */
export function cosineToSemanticScore(cosine: number): number {
  if (!Number.isFinite(cosine)) return 0;
  return Math.max(0, Math.min(1, cosine));
}
