import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { PrismaService } from './../src/db/prisma.service.js';
import {
  addCompanyMember,
  assignPlanToCompany,
  cleanupCompanyAndUsers,
  createTestApp,
  promoteToAdmin,
  registerAndLogin,
  seedCompanyStoreProduct,
} from './support/e2e.helpers.js';

describe('Intelligence (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = 'E2eT3stPass!';
  const userEmail = `e2e-intel-${suffix}@example.com`;
  const adminEmail = `e2e-intel-admin-${suffix}@example.com`;

  let userToken: string;
  let userId: string;
  let adminToken: string;
  let adminId: string;
  let companyId: string;
  let storeId: string;
  let productId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    const user = await registerAndLogin(app, userEmail, password);
    userToken = user.token;
    userId = user.userId;

    const admin = await registerAndLogin(app, adminEmail, password);
    adminId = admin.userId;
    await promoteToAdmin(prisma, adminEmail);
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password });
    adminToken = adminLogin.body.token;

    ({ companyId, storeId, productId } = await seedCompanyStoreProduct(prisma, `${suffix}`));
    await assignPlanToCompany(prisma, companyId, 'PRO');
    await addCompanyMember(prisma, userId, companyId, 'MERCHANT_OWNER');

    await prisma.event.createMany({
      data: [
        { type: 'PRODUCT_VIEW', targetType: 'product', targetId: productId, userId },
        { type: 'PRODUCT_VIEW', targetType: 'product', targetId: productId },
        { type: 'PRODUCT_VIEW', targetType: 'product', targetId: productId },
        { type: 'STORE_VIEW', targetType: 'store', targetId: storeId, userId },
        { type: 'STORE_VIEW', targetType: 'store', targetId: storeId },
        { type: 'PRODUCT_FAVORITE', targetType: 'product', targetId: productId, userId },
        { type: 'WHATSAPP_CLICK', targetType: 'store', targetId: storeId, userId },
        { type: 'SEARCH', metadata: { query: 'arroz-e2e', resultCount: 2 } },
        { type: 'SEARCH', metadata: { query: 'feijao-e2e', resultCount: 0 } },
        { type: 'SEARCH', metadata: { query: 'arroz-e2e', resultCount: 0 } },
      ],
    });
  });

  afterAll(async () => {
    await cleanupCompanyAndUsers(prisma, companyId, [userId, adminId]);
    await app.close();
  });

  describe('Company Intelligence', () => {
    it('returns engagement metrics', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/intelligence/company/${companyId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.companyId).toBe(companyId);
      expect(res.body.engagement.productViews).toBe(3);
      expect(res.body.engagement.storeViews).toBe(2);
      expect(res.body.engagement.productFavorites).toBe(1);
      expect(res.body.engagement.contacts).toBe(1);
    });

    it('returns contact funnel with heuristic disclaimer', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/intelligence/company/${companyId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.contactFunnel).toBeDefined();
      expect(res.body.contactFunnel.totalViews).toBe(2);
      expect(res.body.contactFunnel.totalContacts).toBe(1);
      expect(res.body.contactFunnel.conversionRate).toBe(50);
      expect(res.body.contactFunnel.heuristicDisclaimer).toBe('HEURISTICO_NAO_DEFINITIVO');
    });

    it('supports period presets', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/intelligence/company/${companyId}?startDate=${new Date(Date.now() - 86400000).toISOString()}&endDate=${new Date().toISOString()}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.periodStart).toBeDefined();
      expect(res.body.periodEnd).toBeDefined();
    });
  });

  describe('Company Demand Gap', () => {
    it('returns G1 unmet searches and G3 category gaps', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/intelligence/company/${companyId}/demand-gap`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.unmetSearches).toBeDefined();
      expect(Array.isArray(res.body.unmetSearches)).toBe(true);
      expect(res.body.categoryGaps).toBeDefined();
      expect(Array.isArray(res.body.categoryGaps)).toBe(true);
    });
  });

  describe('Company Time Series', () => {
    it('returns time-bucketed metrics', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/intelligence/company/${companyId}/timeseries?granularity=day&metrics=views,favorites`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.granularity).toBe('day');
      expect(Array.isArray(res.body.series)).toBe(true);
      expect(res.body.periodStart).toBeDefined();
      expect(res.body.periodEnd).toBeDefined();
    });
  });

  describe('Platform Intelligence', () => {
    it('returns platform-wide metrics for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/intelligence/platform')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.totals.totalEvents).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.topProducts)).toBe(true);
      expect(Array.isArray(res.body.topSearches)).toBe(true);
      expect(Array.isArray(res.body.topCompanies)).toBe(true);
      expect(Array.isArray(res.body.topCategories)).toBe(true);
    });

    it('rejects non-admin users', async () => {
      await request(app.getHttpServer())
        .get('/api/intelligence/platform')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('Platform Demand Gap', () => {
    it('returns unmet searches and category gaps for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/intelligence/platform/demand-gap')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.unmetSearches)).toBe(true);
      expect(Array.isArray(res.body.categoryGaps)).toBe(true);
    });
  });

  describe('Platform Time Series', () => {
    it('returns time-bucketed platform metrics for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/intelligence/platform/timeseries?granularity=day')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.granularity).toBe('day');
      expect(Array.isArray(res.body.series)).toBe(true);
    });
  });

  describe('Platform Regions', () => {
    it('returns top regions for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/intelligence/platform/regions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Authorization', () => {
    it('company endpoints require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/intelligence/company/${companyId}`)
        .expect(401);
    });

    it('company endpoints reject non-members', async () => {
      await request(app.getHttpServer())
        .get(`/api/intelligence/company/${companyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('company scope isolation prevents cross-company access', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .get(`/api/intelligence/company/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(res.body.message).toMatch(/não pertence a esta empresa|identificador da empresa é obrigatório/i);
    });

    it('rejects FREE plan company from intelligence endpoints', async () => {
      const freeSuffix = `${Date.now()}-free-${Math.random().toString(36).slice(2, 8)}`;
      const freeUser = await registerAndLogin(app, `e2e-intel-free-${freeSuffix}@example.com`, password);
      const { companyId: freeCompanyId } = await seedCompanyStoreProduct(prisma, `free-${freeSuffix}`);
      await addCompanyMember(prisma, freeUser.userId, freeCompanyId, 'MERCHANT_OWNER');

      const res = await request(app.getHttpServer())
        .get(`/api/intelligence/company/${freeCompanyId}`)
        .set('Authorization', `Bearer ${freeUser.token}`)
        .expect(403);

      expect(res.body.message).toMatch(/plano com analytics ativo/i);

      await cleanupCompanyAndUsers(prisma, freeCompanyId, [freeUser.userId]);
    });
  });
});
