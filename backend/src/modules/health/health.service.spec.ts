import { jest } from '@jest/globals';
import { HealthService } from './health.service.js';

function makeService(options: {
  database?: boolean;
  valkey?: boolean;
  search?: boolean | null;
} = {}) {
  const prisma = {
    $queryRaw: options.database === false
      ? jest.fn().mockRejectedValue(new Error('db down'))
      : jest.fn().mockResolvedValue([{ ok: 1 }]),
  };
  const valkey = {
    ping: jest.fn().mockResolvedValue(options.valkey ?? true),
  };
  const search = {
    health: options.search === null
      ? undefined
      : jest.fn().mockResolvedValue(options.search ?? true),
  };
  const service = new HealthService(prisma as never, valkey as never, search as never);
  return { service, prisma, valkey, search };
}

describe('HealthService', () => {
  it('liveness always reports ok', () => {
    const { service } = makeService();
    expect(service.liveness()).toEqual({ status: 'ok' });
  });

  it('readiness is ok when every dependency is healthy', async () => {
    const { service } = makeService();
    await expect(service.readiness()).resolves.toEqual({
      status: 'ok',
      checks: { database: true, valkey: true, search: true },
    });
  });

  it('readiness is degraded when valkey is unhealthy', async () => {
    const { service } = makeService({ valkey: false });
    const result = await service.readiness();
    expect(result.status).toBe('degraded');
    expect(result.checks).toEqual({ database: true, valkey: false, search: true });
  });

  it('readiness is degraded when search is unhealthy', async () => {
    const { service } = makeService({ search: false });
    await expect(service.readiness()).resolves.toMatchObject({
      status: 'degraded',
      checks: { database: true, valkey: true, search: false },
    });
  });

  it('treats a provider without health() as healthy', async () => {
    const { service } = makeService({ search: null });
    await expect(service.readiness()).resolves.toMatchObject({
      status: 'ok',
      checks: { database: true, valkey: true, search: true },
    });
  });

  it('readiness is unavailable when the database is down', async () => {
    const { service } = makeService({ database: false });
    await expect(service.readiness()).resolves.toMatchObject({
      status: 'unavailable',
      checks: { database: false },
    });
  });
});
