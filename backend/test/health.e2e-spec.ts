import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { createTestApp } from './support/e2e.helpers.js';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health/live reports the process is up', async () => {
    const res = await request(app.getHttpServer()).get('/api/health/live').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /api/health/ready reports dependency checks', async () => {
    const res = await request(app.getHttpServer()).get('/api/health/ready');

    expect([200, 503]).toContain(res.status);
    expect(['ok', 'degraded', 'unavailable']).toContain(res.body.status);
    expect(res.body.checks).toBeDefined();
    expect(typeof res.body.checks.database).toBe('boolean');
    expect(typeof res.body.checks.valkey).toBe('boolean');
    expect(typeof res.body.checks.search).toBe('boolean');
  });
});
