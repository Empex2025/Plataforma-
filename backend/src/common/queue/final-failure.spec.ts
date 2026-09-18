import { isFinalAttempt } from './final-failure.js';

function job(attemptsMade: number, attempts?: number) {
  return { attemptsMade, opts: attempts === undefined ? {} : { attempts } } as never;
}

describe('isFinalAttempt', () => {
  it('should be false for undefined job', () => {
    expect(isFinalAttempt(undefined)).toBe(false);
    expect(isFinalAttempt(null)).toBe(false);
  });

  it('should be false before exhausting attempts', () => {
    expect(isFinalAttempt(job(1, 3))).toBe(false);
    expect(isFinalAttempt(job(2, 3))).toBe(false);
  });

  it('should be true when attempts are exhausted', () => {
    expect(isFinalAttempt(job(3, 3))).toBe(true);
    expect(isFinalAttempt(job(4, 3))).toBe(true);
  });

  it('should treat a missing attempts option as a single attempt', () => {
    expect(isFinalAttempt(job(0))).toBe(false);
    expect(isFinalAttempt(job(1))).toBe(true);
  });
});
