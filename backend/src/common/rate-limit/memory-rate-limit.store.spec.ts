import { jest } from '@jest/globals';
import { MemoryRateLimitStore } from './memory-rate-limit.store.js';

describe('MemoryRateLimitStore', () => {
  let now: number;

  beforeEach(() => {
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('counts up to the limit and resets after the ttl', async () => {
    const store = new MemoryRateLimitStore();

    const first = await store.increment('k', 1000);
    expect(first.count).toBe(1);
    expect(first.resetAt).toBe(now + 1000);

    expect((await store.increment('k', 1000)).count).toBe(2);
    expect((await store.increment('k', 1000)).count).toBe(3);

    now += 1001;
    expect((await store.increment('k', 1000)).count).toBe(1);
  });

  it('keeps independent counters per key', async () => {
    const store = new MemoryRateLimitStore();

    await store.increment('a', 1000);
    await store.increment('a', 1000);

    expect((await store.increment('b', 1000)).count).toBe(1);
  });
});
