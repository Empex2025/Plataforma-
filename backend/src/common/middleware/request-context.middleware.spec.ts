import { jest } from '@jest/globals';
import { requestContextMiddleware } from './request-context.middleware.js';

function makeResponse() {
  let finish: (() => void) | undefined;
  return {
    setHeader: jest.fn(),
    on: jest.fn((event: string, callback: () => void) => {
      if (event === 'finish') finish = callback;
    }),
    emitFinish: () => finish?.(),
  };
}

describe('requestContextMiddleware', () => {
  it('propagates a valid incoming request id', () => {
    const req = { method: 'GET', originalUrl: '/api/health/live', headers: { 'x-request-id': 'abc-123' } };
    const res = makeResponse();
    const next = jest.fn();

    requestContextMiddleware(req as never, res as never, next as never);

    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'abc-123');
    expect(next).toHaveBeenCalled();
    expect(() => res.emitFinish()).not.toThrow();
  });

  it('generates an id when none is provided', () => {
    const req = { method: 'GET', originalUrl: '/api/x', headers: {} };
    const res = makeResponse();

    requestContextMiddleware(req as never, res as never, jest.fn() as never);

    const id = (res.setHeader as jest.Mock).mock.calls[0][1];
    expect(typeof id).toBe('string');
    expect((id as string).length).toBeGreaterThan(10);
  });

  it('ignores an oversized incoming request id', () => {
    const huge = 'a'.repeat(500);
    const req = { method: 'GET', originalUrl: '/api/x', headers: { 'x-request-id': huge } };
    const res = makeResponse();

    requestContextMiddleware(req as never, res as never, jest.fn() as never);

    const id = (res.setHeader as jest.Mock).mock.calls[0][1];
    expect(id).not.toBe(huge);
  });
});
