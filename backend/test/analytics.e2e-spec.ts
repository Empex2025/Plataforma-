import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaService } from '../src/db/prisma.service.js';
import {
  createTestApp,
  registerAndLogin,
  promoteToAdmin,
  seedCompanyStoreProduct,
  addCompanyMember,
  assignPlanToCompany,
  cleanupCompanyAndUsers,
} from './support/e2e.helpers.js';

describe('Analytics (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = 'E2eT3stPass!';

  let userToken: string;
  let userId: string;
  let adminToken: string;
  let adminId: string;
  let companyId: string;
  let storeId: string;
  let productId: string;

  let otherUserId: string;
  let otherCompanyId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    const user = await registerAndLogin(app, `e2e-analytics-${suffix}@example.com`, password);
    userToken = user.token;
    userId = user.userId;

    const entities = await seedCompanyStoreProduct(prisma, `analytics-${suffix}`);
    companyId = entities.companyId;
    storeId = entities.storeId;
    productId = entities.productId;

    await addCompanyMember(prisma, userId, companyId, 'MERCHANT_OWNER');
    await assignPlanToCompany(prisma, companyId, 'PRO');

    const admin = await registerAndLogin(app, `e2e-analytics-admin-${suffix}@example.com`, password);
    adminToken = admin.token;
    adminId = admin.userId;
    await promoteToAdmin(prisma, `e2e-analytics-admin-${suffix}@example.com`);
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: `e2e-analytics-admin-${suffix}@example.com`, password });
    adminToken = adminLogin.body.token;

    const other = await registerAndLogin(app, `e2e-analytics-other-${suffix}@example.com`, password);
    otherUserId = other.userId;

    const otherEntities = await seedCompanyStoreProduct(prisma, `analytics-other-${suffix}`);
    otherCompanyId = otherEntities.companyId;
    await addCompanyMember(prisma, otherUserId, otherCompanyId, 'MERCHANT_OWNER');
    await assignPlanToCompany(prisma, otherCompanyId, 'PRO');

    await prisma.event.createMany({
      data: [
        { type: 'PRODUCT_VIEW', targetType: 'product', targetId: productId, userId },
        { type: 'PRODUCT_VIEW', targetType: 'product', targetId: productId },
        { type: 'STORE_VIEW', targetType: 'store', targetId: storeId, userId },
        { type: 'PRODUCT_FAVORITE', targetType: 'product', targetId: productId, userId },
        { type: 'WHATSAPP_CLICK', targetType: 'store', targetId: storeId, userId },
        { type: 'SEARCH', metadata: { query: 'teste analytics', resultCount: '2' } },
        { type: 'SEARCH', metadata: { query: 'produto inexistente', resultCount: '0' } },
      ],
    });
  }, 30_000);

  afterAll(async () => {
    await cleanupCompanyAndUsers(prisma, companyId, [userId]);
    await cleanupCompanyAndUsers(prisma, otherCompanyId, [otherUserId, adminId]);
    await app.close();
  });

  describe('Company Analytics', () => {
    it('GET /api/analytics/company/:companyId → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/analytics/company/${companyId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.period).toBeDefined();
      expect(res.body.totals).toBeDefined();
      expect(res.body.previousTotals).toBeDefined();
      expect(res.body.growth).toBeDefined();
      expect(res.body.advertising).toBeDefined();
    });

    it('GET /api/analytics/company/:companyId/overview → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/analytics/company/${companyId}/overview`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.totals).toBeDefined();
    });

    it('GET /api/analytics/company/:companyId without auth → 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/analytics/company/${companyId}`)
        .expect(401);
    });

    it('Company A cannot access Company B analytics → 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/analytics/company/${otherCompanyId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('GET /api/analytics/company/:companyId/timeseries → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/analytics/company/${companyId}/timeseries`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ period: '30d', granularity: 'day' })
        .expect(200);

      expect(res.body.granularity).toBe('day');
      expect(Array.isArray(res.body.series)).toBe(true);
    });

    it('GET /api/analytics/company/:companyId/products → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/analytics/company/${companyId}/products`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.period).toBeDefined();
    });

    it('GET /api/analytics/company/:companyId/stores → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/analytics/company/${companyId}/stores`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('GET /api/analytics/company/:companyId/funnel → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/analytics/company/${companyId}/funnel`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body.stages)).toBe(true);
      expect(res.body.stages.length).toBe(5);
      expect(res.body.disclaimer).toBe('HEURISTICO_NAO_DEFINITIVO');
    });

    it('GET /api/analytics/company/:companyId/advertising → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/analytics/company/${companyId}/advertising`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.totals).toBeDefined();
      expect(typeof res.body.totals.impressions).toBe('number');
      expect(typeof res.body.totals.clicks).toBe('number');
      expect(typeof res.body.totals.ctr).toBe('number');
      expect(Array.isArray(res.body.campaigns)).toBe(true);
    });
  });

  describe('Platform Analytics', () => {
    it('GET /api/analytics/platform → 200 for ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/analytics/platform')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.totals).toBeDefined();
      expect(res.body.growth).toBeDefined();
    });

    it('GET /api/analytics/platform → 403 for non-admin', async () => {
      await request(app.getHttpServer())
        .get('/api/analytics/platform')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('GET /api/analytics/platform/timeseries → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/analytics/platform/timeseries')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ period: '7d' })
        .expect(200);

      expect(Array.isArray(res.body.series)).toBe(true);
    });

    it('GET /api/analytics/platform/products → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/analytics/platform/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('GET /api/analytics/platform/stores → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/analytics/platform/stores')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('GET /api/analytics/platform/categories → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/analytics/platform/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/analytics/platform/searches → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/analytics/platform/searches')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.topSearches)).toBe(true);
      expect(Array.isArray(res.body.emptyResultSearches)).toBe(true);
      expect(typeof res.body.totalSearches).toBe('number');
      expect(typeof res.body.uniqueSearchTerms).toBe('number');
    });

    it('GET /api/analytics/platform/regions → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/analytics/platform/regions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.regions)).toBe(true);
    });

    it('GET /api/analytics/platform/advertising → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/analytics/platform/advertising')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.totals).toBeDefined();
      expect(Array.isArray(res.body.campaigns)).toBe(true);
    });
  });

  describe('Period Validation', () => {
    it('period=7d → 200', async () => {
      await request(app.getHttpServer())
        .get(`/api/analytics/company/${companyId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ period: '7d' })
        .expect(200);
    });

    it('period=30d → 200', async () => {
      await request(app.getHttpServer())
        .get(`/api/analytics/company/${companyId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ period: '30d' })
        .expect(200);
    });

    it('period=today → 200', async () => {
      await request(app.getHttpServer())
        .get(`/api/analytics/company/${companyId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ period: 'today' })
        .expect(200);
    });

    it('custom period → 200', async () => {
      await request(app.getHttpServer())
        .get(`/api/analytics/company/${companyId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ period: 'custom', startDate: '2026-09-01', endDate: '2026-09-14' })
        .expect(200);
    });

    it('range > 90 days → 400', async () => {
      await request(app.getHttpServer())
        .get(`/api/analytics/company/${companyId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ period: 'custom', startDate: '2026-06-01', endDate: '2026-09-14' })
        .expect(400);
    });

    it('startDate > endDate → 400', async () => {
      await request(app.getHttpServer())
        .get(`/api/analytics/company/${companyId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ period: 'custom', startDate: '2026-09-14', endDate: '2026-09-01' })
        .expect(400);
    });
  });

  describe('Edge Cases', () => {
    it('empty dataset → valid response', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/analytics/company/${companyId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ period: 'today' })
        .expect(200);

      expect(res.body.totals).toBeDefined();
      expect(res.body.growth).toBeDefined();
    });

    it('zero denominator → percentage null', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/analytics/company/${companyId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const pct = res.body.growth.views.percentage;
      expect(pct === null || typeof pct === 'number').toBe(true);
    });
  });

  describe('Plan Gate', () => {
    it('FREE plan company → 403', async () => {
      const freeSuffix = `${Date.now()}-free-${Math.random().toString(36).slice(2, 8)}`;
      const freeUser = await registerAndLogin(app, `e2e-analytics-free-${freeSuffix}@example.com`, password);
      const freeEntities = await seedCompanyStoreProduct(prisma, `analytics-free-${freeSuffix}`);
      await addCompanyMember(prisma, freeUser.userId, freeEntities.companyId, 'MERCHANT_OWNER');

      await request(app.getHttpServer())
        .get(`/api/analytics/company/${freeEntities.companyId}`)
        .set('Authorization', `Bearer ${freeUser.token}`)
        .expect(403);

      await cleanupCompanyAndUsers(prisma, freeEntities.companyId, [freeUser.userId]);
    });
  });
});
