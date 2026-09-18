import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3';
import { PrismaService } from './../src/db/prisma.service.js';
import { registerAndLogin, createTestApp } from './support/e2e.helpers.js';

describe('Admin observability (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let consumerToken: string;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = 'E2eT3stPass!';
  const adminEmail = `e2e-admin-metrics-${suffix}@example.com`;
  const consumerEmail = `e2e-consumer-metrics-${suffix}@example.com`;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    await registerAndLogin(app, adminEmail, password);
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: 'SUPER_ADMIN' },
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password });
    adminToken = adminLogin.body.token;

    consumerToken = (await registerAndLogin(app, consumerEmail, password)).token;

    const s3 = new S3Client({
      endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
      region: process.env.S3_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
      },
      forcePathStyle: true,
    });

    await s3
      .send(new CreateBucketCommand({ Bucket: process.env.S3_BUCKET ?? 'imports' }))
      .catch(() => undefined);
  });

  afterAll(async () => {
    await prisma.user
      .deleteMany({ where: { email: { in: [adminEmail, consumerEmail] } } })
      .catch(() => undefined);
    await app.close();
  });

  describe('GET /api/admin/metrics', () => {
    it('returns the metrics snapshot and queue depths for platform admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.metrics).toBeDefined();
      expect(res.body.metrics.http).toHaveProperty('total');
      expect(res.body.metrics.search).toHaveProperty('failures');
      expect(res.body.metrics.queue).toHaveProperty('finalFailures');
      expect(res.body.queues).toBeDefined();
    });

    it('forbids non-admin users', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(403);
    });
  });

  describe('GET /api/admin/imports/reconciliation', () => {
    it('returns a read-only reconciliation report for platform admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/imports/reconciliation')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('jobsMissingObject');
      expect(res.body).toHaveProperty('objectsMissingJob');
      expect(res.body.prefix).toBe('imports/');
    });

    it('forbids non-admin users', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/imports/reconciliation')
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(403);
    });
  });
});
