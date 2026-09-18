import { MetricsRegistry } from './metrics.registry.js';

describe('MetricsRegistry', () => {
  let registry: MetricsRegistry;

  beforeEach(() => {
    registry = new MetricsRegistry();
  });

  it('should aggregate HTTP requests by status class and latency', () => {
    registry.recordHttp('GET', 200, 10);
    registry.recordHttp('POST', 201, 20);
    registry.recordHttp('GET', 500, 30);

    const snapshot = registry.snapshot();

    expect(snapshot.http.total).toBe(3);
    expect(snapshot.http.byStatusClass).toEqual({ '2xx': 2, '5xx': 1 });
    expect(snapshot.http.latency.count).toBe(3);
    expect(snapshot.http.latency.sumMs).toBe(60);
    expect(snapshot.http.latency.maxMs).toBe(30);
    expect(snapshot.http.latency.avgMs).toBe(20);
  });

  it('should track search latency and failures', () => {
    registry.recordSearch(100, false);
    registry.recordSearch(300, true);

    const snapshot = registry.snapshot();

    expect(snapshot.search.total).toBe(2);
    expect(snapshot.search.failures).toBe(1);
    expect(snapshot.search.latency.maxMs).toBe(300);
  });

  it('should track provider failures', () => {
    registry.recordProviderFailure('search');
    registry.recordProviderFailure('search');
    registry.recordProviderFailure('storage');

    expect(registry.snapshot().providers.failures).toEqual({
      search: 2,
      storage: 1,
    });
  });

  it('should track queue job outcomes per queue', () => {
    registry.recordQueueJob('imports', 'succeeded');
    registry.recordQueueJob('imports', 'failed');
    registry.recordQueueJob('search-index', 'succeeded');
    registry.recordFinalFailure('imports');

    const snapshot = registry.snapshot();

    expect(snapshot.queue.succeeded).toBe(2);
    expect(snapshot.queue.failed).toBe(1);
    expect(snapshot.queue.finalFailures).toBe(1);
    expect(snapshot.queue.byName).toEqual({
      imports: { succeeded: 1, failed: 1 },
      'search-index': { succeeded: 1, failed: 0 },
    });
    expect(snapshot.providers.failures['queue:imports']).toBe(1);
  });

  it('should ignore invalid latency values', () => {
    registry.recordHttp('GET', 200, Number.NaN);
    registry.recordHttp('GET', 200, -5);

    const latency = registry.snapshot().http.latency;
    expect(latency.count).toBe(2);
    expect(latency.sumMs).toBe(0);
    expect(latency.maxMs).toBe(0);
  });

  it('should reset all metrics', () => {
    registry.recordHttp('GET', 200, 10);
    registry.recordSearch(50, true);
    registry.recordQueueJob('imports', 'failed');

    registry.reset();

    const snapshot = registry.snapshot();
    expect(snapshot.http.total).toBe(0);
    expect(snapshot.search.total).toBe(0);
    expect(snapshot.queue.failed).toBe(0);
    expect(snapshot.providers.failures).toEqual({});
  });
});
