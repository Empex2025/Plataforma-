import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaService } from '@/db/prisma.service.js';
import {
  registerAndLogin,
  seedCompanyStoreProduct,
  assignPlanToCompany,
  addCompanyMember,
  cleanupCompanyAndUsers,
  createTestApp,
} from './support/e2e.helpers.js';

describe('Advertising (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let userId: string;
  let companyId: string;
  let authToken: string;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = 'E2eT3stPass!';
  const email = `e2e-adv-${suffix}@example.com`;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    const user = await registerAndLogin(app, email, password);
    userId = user.userId;
    authToken = user.token;

    const entities = await seedCompanyStoreProduct(prisma, `adv-${suffix}`);
    companyId = entities.companyId;
    await prisma.plan.update({ where: { tier: 'PREMIUM' }, data: { advertising: true } }).catch(() => undefined);
    await assignPlanToCompany(prisma, companyId, 'PREMIUM');
    await addCompanyMember(prisma, userId, companyId, 'MERCHANT_OWNER');
  });

  afterAll(async () => {
    await cleanupCompanyAndUsers(prisma, companyId, [userId]);
    await app.close();
  });

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE campaign_metrics CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE sponsored_items CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE campaigns CASCADE`;
  });

  describe('POST /api/advertising/campaigns', () => {
    it('should create a campaign when advertising is allowed', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/advertising/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId)
        .send({
          name: 'Test Campaign',
          budget: 100,
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Test Campaign');
      expect(response.body.status).toBe('DRAFT');
    });

    it('should return 403 when advertising is not allowed', async () => {
      const freeEmail = `e2e-adv-free-${suffix}@example.com`;
      const freeUser = await registerAndLogin(app, freeEmail, password);
      const freeEntities = await seedCompanyStoreProduct(prisma, `adv-free-${suffix}`);
      await assignPlanToCompany(prisma, freeEntities.companyId, 'FREE');
      await addCompanyMember(prisma, freeUser.userId, freeEntities.companyId, 'MERCHANT_OWNER');

      const response = await request(app.getHttpServer())
        .post('/api/advertising/campaigns')
        .set('Authorization', `Bearer ${freeUser.token}`)
        .set('x-company-id', freeEntities.companyId)
        .send({
          name: 'Test Campaign',
        });

      expect(response.status).toBe(403);

      await cleanupCompanyAndUsers(prisma, freeEntities.companyId, [freeUser.userId]);
    });
  });

  describe('GET /api/advertising/campaigns', () => {
    it('should list campaigns for the company', async () => {
      await request(app.getHttpServer())
        .post('/api/advertising/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId)
        .send({ name: 'Campaign 1' });

      await request(app.getHttpServer())
        .post('/api/advertising/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId)
        .send({ name: 'Campaign 2' });

      const response = await request(app.getHttpServer())
        .get('/api/advertising/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });
  });

  describe('POST /api/advertising/campaigns/:id/activate', () => {
    it('should activate a DRAFT campaign', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/advertising/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId)
        .send({ name: 'To Activate' });

      const campaignId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .post(`/api/advertising/campaigns/${campaignId}/activate`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ACTIVE');
    });
  });

  describe('POST /api/advertising/campaigns/:id/pause', () => {
    it('should pause an ACTIVE campaign', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/advertising/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId)
        .send({ name: 'To Pause' });

      const campaignId = createResponse.body.id;

      await request(app.getHttpServer())
        .post(`/api/advertising/campaigns/${campaignId}/activate`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId);

      const response = await request(app.getHttpServer())
        .post(`/api/advertising/campaigns/${campaignId}/pause`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('PAUSED');
    });
  });

  describe('GET /api/advertising/campaigns/:id/metrics', () => {
    it('should return metrics for a campaign', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/advertising/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId)
        .send({ name: 'With Metrics' });

      const campaignId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/api/advertising/campaigns/${campaignId}/metrics`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId);

      expect(response.status).toBe(200);
      expect(response.body.impressions).toBe(0);
      expect(response.body.clicks).toBe(0);
      expect(response.body.ctr).toBe(0);
    });
  });
});
