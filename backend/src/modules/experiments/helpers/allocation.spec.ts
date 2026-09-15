import { validateAllocation } from './allocation.js';

describe('validateAllocation', () => {
  it('accepts a valid 50/50 split', () => {
    expect(() =>
      validateAllocation([
        { key: 'CONTROL', allocation: 50 },
        { key: 'TREATMENT', allocation: 50 },
      ]),
    ).not.toThrow();
  });

  it('accepts a valid 90/10 rollout', () => {
    expect(() =>
      validateAllocation([
        { key: 'CONTROL', allocation: 90 },
        { key: 'TREATMENT', allocation: 10 },
      ]),
    ).not.toThrow();
  });

  it('rejects an empty variant set', () => {
    expect(() => validateAllocation([])).toThrow(/At least one variant/);
  });

  it('rejects a sum different from 100', () => {
    expect(() =>
      validateAllocation([
        { key: 'CONTROL', allocation: 60 },
        { key: 'TREATMENT', allocation: 30 },
      ]),
    ).toThrow(/must sum to 100/);
  });

  it('rejects negative allocation', () => {
    expect(() =>
      validateAllocation([
        { key: 'CONTROL', allocation: 110 },
        { key: 'TREATMENT', allocation: -10 },
      ]),
    ).toThrow(/between 0 and 100/);
  });

  it('rejects duplicate variant keys', () => {
    expect(() =>
      validateAllocation([
        { key: 'CONTROL', allocation: 50 },
        { key: 'CONTROL', allocation: 50 },
      ]),
    ).toThrow(/Duplicate variant key/);
  });

  it('rejects an empty key', () => {
    expect(() => validateAllocation([{ key: '  ', allocation: 100 }])).toThrow(/key is required/);
  });
});
