import { DEFAULT_JOB_OPTIONS } from './job-options.js';

describe('DEFAULT_JOB_OPTIONS', () => {
  it('retries with exponential backoff', () => {
    expect(DEFAULT_JOB_OPTIONS.attempts).toBe(3);
    expect(DEFAULT_JOB_OPTIONS.backoff).toEqual({ type: 'exponential', delay: 2000 });
  });

  it('bounds completed jobs by age and count', () => {
    expect(DEFAULT_JOB_OPTIONS.removeOnComplete).toEqual({ age: 86400, count: 1000 });
  });

  it('bounds failed jobs by age and count', () => {
    expect(DEFAULT_JOB_OPTIONS.removeOnFail).toEqual({ age: 604800, count: 5000 });
  });
});
