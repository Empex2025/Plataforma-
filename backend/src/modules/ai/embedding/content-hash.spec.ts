import { computeContentHash } from './content-hash.js';

describe('computeContentHash', () => {
  it('is deterministic for the same text and version', () => {
    const a = computeContentHash('produto de corrida', 'v1');
    const b = computeContentHash('produto de corrida', 'v1');
    expect(a).toBe(b);
  });

  it('changes when the text changes', () => {
    expect(computeContentHash('a', 'v1')).not.toBe(computeContentHash('b', 'v1'));
  });

  it('changes when the representation version changes', () => {
    expect(computeContentHash('same', 'v1')).not.toBe(computeContentHash('same', 'v2'));
  });

  it('produces a sha256 hex string', () => {
    expect(computeContentHash('x', 'v1')).toMatch(/^[a-f0-9]{64}$/);
  });
});
