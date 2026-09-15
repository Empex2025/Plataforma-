import { withTimeout, TimeoutError } from './with-timeout.js';

describe('withTimeout', () => {
  it('resolves when the operation completes in time', async () => {
    await expect(withTimeout(Promise.resolve(42), 100, 'op')).resolves.toBe(42);
  });

  it('rejects with TimeoutError when the operation is too slow', async () => {
    const slow = new Promise((resolve) => setTimeout(resolve, 50));
    await expect(withTimeout(slow, 10, 'op')).rejects.toBeInstanceOf(TimeoutError);
  });

  it('passes through when ms is not positive', async () => {
    await expect(withTimeout(Promise.resolve(1), 0)).resolves.toBe(1);
  });

  it('propagates operation rejection', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 100)).rejects.toThrow('boom');
  });
});
