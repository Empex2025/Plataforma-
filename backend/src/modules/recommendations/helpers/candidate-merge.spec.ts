import { mergeCandidates } from './candidate-merge.js';

describe('mergeCandidates', () => {
  it('unions all sources preserving deterministic priority', () => {
    const merged = mergeCandidates(
      { deterministic: ['a', 'b'], semantic: ['c', 'a'], behavioral: ['d', 'b'] },
      10,
    );
    expect(merged).toEqual(['a', 'b', 'c', 'd']);
  });

  it('deduplicates across sources', () => {
    const merged = mergeCandidates({ deterministic: ['a'], semantic: ['a'], behavioral: ['a'] }, 10);
    expect(merged).toEqual(['a']);
  });

  it('honors the limit', () => {
    const merged = mergeCandidates({ deterministic: ['a', 'b', 'c', 'd'] }, 2);
    expect(merged).toEqual(['a', 'b']);
  });

  it('handles missing sources', () => {
    expect(mergeCandidates({ semantic: ['x'] }, 10)).toEqual(['x']);
    expect(mergeCandidates({}, 10)).toEqual([]);
  });

  it('ignores empty ids', () => {
    expect(mergeCandidates({ deterministic: ['', 'a'] }, 10)).toEqual(['a']);
  });
});
