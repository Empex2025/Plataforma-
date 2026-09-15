import { filterLiteral } from './search-filter.js';

describe('filterLiteral', () => {
  it('wraps plain values in double quotes', () => {
    expect(filterLiteral('Fortaleza')).toBe('"Fortaleza"');
  });

  it('escapes double quotes to prevent filter injection', () => {
    expect(filterLiteral('x" OR active = true')).toBe('"x\\" OR active = true"');
  });

  it('escapes backslashes', () => {
    expect(filterLiteral('a\\b')).toBe('"a\\\\b"');
  });
});
