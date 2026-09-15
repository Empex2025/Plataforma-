import { createHash } from 'node:crypto';

export function computeContentHash(text: string, representationVersion: string): string {
  return createHash('sha256').update(`${representationVersion}\n${text}`).digest('hex');
}
