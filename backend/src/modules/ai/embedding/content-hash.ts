import { createHash } from 'node:crypto';

/**
 * Computes the content hash for an entity representation.
 *
 * The hash combines the representation version with the normalized text, so an
 * embedding is considered stale (and regenerated) whenever the text or the
 * representation scheme changes.
 */
export function computeContentHash(text: string, representationVersion: string): string {
  return createHash('sha256').update(`${representationVersion}\n${text}`).digest('hex');
}
