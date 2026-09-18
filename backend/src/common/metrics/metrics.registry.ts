export type QueueJobOutcome = 'succeeded' | 'failed';

export interface LatencyStats {
  count: number;
  sumMs: number;
  maxMs: number;
  avgMs: number;
}

export interface MetricsSnapshot {
  http: {
    total: number;
    byStatusClass: Record<string, number>;
    latency: LatencyStats;
  };
  search: {
    total: number;
    failures: number;
    latency: LatencyStats;
  };
  providers: {
    failures: Record<string, number>;
  };
  queue: {
    succeeded: number;
    failed: number;
    finalFailures: number;
    byName: Record<string, { succeeded: number; failed: number }>;
  };
}

function emptyLatency(): { count: number; sumMs: number; maxMs: number } {
  return { count: 0, sumMs: 0, maxMs: 0 };
}

function toLatencyStats(raw: { count: number; sumMs: number; maxMs: number }): LatencyStats {
  return {
    count: raw.count,
    sumMs: raw.sumMs,
    maxMs: raw.maxMs,
    avgMs: raw.count > 0 ? raw.sumMs / raw.count : 0,
  };
}

export class MetricsRegistry {
  private httpTotal = 0;
  private httpByStatusClass: Record<string, number> = {};
  private httpLatency = emptyLatency();

  private searchTotal = 0;
  private searchFailures = 0;
  private searchLatency = emptyLatency();

  private providerFailures: Record<string, number> = {};

  private queueSucceeded = 0;
  private queueFailed = 0;
  private queueFinalFailures = 0;
  private queueByName: Record<string, { succeeded: number; failed: number }> = {};

  recordHttp(method: string, statusCode: number, durationMs: number): void {
    this.httpTotal += 1;
    const statusClass = `${Math.floor(statusCode / 100)}xx`;
    this.httpByStatusClass[statusClass] = (this.httpByStatusClass[statusClass] ?? 0) + 1;
    this.recordLatency(this.httpLatency, durationMs);
    void method;
  }

  recordSearch(durationMs: number, failed = false): void {
    this.searchTotal += 1;
    if (failed) this.searchFailures += 1;
    this.recordLatency(this.searchLatency, durationMs);
  }

  recordProviderFailure(provider: string): void {
    this.providerFailures[provider] = (this.providerFailures[provider] ?? 0) + 1;
  }

  recordQueueJob(queueName: string, outcome: QueueJobOutcome): void {
    const bucket = (this.queueByName[queueName] ??= { succeeded: 0, failed: 0 });
    if (outcome === 'succeeded') {
      this.queueSucceeded += 1;
      bucket.succeeded += 1;
    } else {
      this.queueFailed += 1;
      bucket.failed += 1;
    }
  }

  recordFinalFailure(queueName: string): void {
    this.queueFinalFailures += 1;
    this.recordProviderFailure(`queue:${queueName}`);
  }

  snapshot(): MetricsSnapshot {
    return {
      http: {
        total: this.httpTotal,
        byStatusClass: { ...this.httpByStatusClass },
        latency: toLatencyStats(this.httpLatency),
      },
      search: {
        total: this.searchTotal,
        failures: this.searchFailures,
        latency: toLatencyStats(this.searchLatency),
      },
      providers: {
        failures: { ...this.providerFailures },
      },
      queue: {
        succeeded: this.queueSucceeded,
        failed: this.queueFailed,
        finalFailures: this.queueFinalFailures,
        byName: { ...this.queueByName },
      },
    };
  }

  reset(): void {
    this.httpTotal = 0;
    this.httpByStatusClass = {};
    this.httpLatency = emptyLatency();
    this.searchTotal = 0;
    this.searchFailures = 0;
    this.searchLatency = emptyLatency();
    this.providerFailures = {};
    this.queueSucceeded = 0;
    this.queueFailed = 0;
    this.queueFinalFailures = 0;
    this.queueByName = {};
  }

  private recordLatency(
    target: { count: number; sumMs: number; maxMs: number },
    durationMs: number,
  ): void {
    const safe = Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : 0;
    target.count += 1;
    target.sumMs += safe;
    if (safe > target.maxMs) target.maxMs = safe;
  }
}

export const metricsRegistry = new MetricsRegistry();
