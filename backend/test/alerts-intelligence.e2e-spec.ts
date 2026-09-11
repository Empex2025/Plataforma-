import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { PrismaService } from './../src/db/prisma.service.js';
import {
  addCompanyMember,
  cleanupCompanyAndUsers,
  createTestApp,
  promoteToAdmin,
  registerAndLogin,
  seedCompanyStoreProduct,
} from './support/e2e.helpers.js';

describe('Alerts + Intelligence (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const password = 'E2eT3stPass!';
  const userEmail = `e2e-alerts-${suffix}@example.com`;
  const otherEmail = `e2e-alerts-other-${suffix}@example.com`;
  const adminEmail = `e2e-alerts-admin-${suffix}@example.com`;

  let userToken: string;
  let otherToken: string;
  let adminToken: string;
  let userId: string;
  let otherId: string;
  let adminId: string;
  let companyId: string;
  let storeId: string;
  let productId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    const user = await registerAndLogin(app, userEmail, password);
    userToken = user.token;
    userId = user.userId;

    const other = await registerAndLogin(app, otherEmail, password);
    otherToken = other.token;
    otherId = other.userId;

    const admin = await registerAndLogin(app, adminEmail, password);
    adminId = admin.userId;
    await promoteToAdmin(prisma, adminEmail);
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password });
    adminToken = adminLogin.body.token;

    ({ companyId, storeId, productId } = await seedCompanyStoreProduct(prisma, `${suffix}`));
    await addCompanyMember(prisma, userId, companyId, 'MERCHANT_OWNER');

    await prisma.event.createMany({
      data: [
        { type: 'PRODUCT_VIEW', targetType: 'product', targetId: productId, userId },
        { type: 'PRODUCT_VIEW', targetType: 'product', targetId: productId },
        { type: 'WHATSAPP_CLICK', targetType: 'product', targetId: productId },
        { type: 'STORE_VIEW', targetType: 'store', targetId: storeId },
        { type: 'SEARCH', metadata: { query: 'arroz-e2e' } },
      ],
    });
  });

  afterAll(async () => {
    await cleanupCompanyAndUsers(prisma, companyId, [userId, otherId, adminId]);
    await app.close();
  });

  describe('Alerts', () => {
    let alertId: string;

    it('creates a price alert', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/alerts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ targetType: 'product', targetId: productId, trigger: 'PRICE_BELOW', threshold: '20.00' })
        .expect(201);

      expect(res.body.trigger).toBe('PRICE_BELOW');
      expect(res.body.active).toBe(true);
      alertId = res.body.id;
    });

    it('rejects an invalid trigger', async () => {
      await request(app.getHttpServer())
        .post('/api/alerts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ targetType: 'product', targetId: productId, trigger: 'NOT_A_TRIGGER' })
        .expect(400);
    });

    it('requires authentication', async () => {
      await request(app.getHttpServer()).get('/api/alerts').expect(401);
    });

    it('lists the user alerts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/alerts')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.length).toBe(1);
    });

    it('updates own alert', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/alerts/${alertId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ active: false })
        .expect(200);
      expect(res.body.active).toBe(false);
    });

    it("cannot update another user's alert", async () => {
      await request(app.getHttpServer())
        .patch(`/api/alerts/${alertId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ active: true })
        .expect(403);
    });

    it('deletes own alert', async () => {
      await request(app.getHttpServer())
        .delete(`/api/alerts/${alertId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });

  describe('Company Intelligence', () => {
    it('returns company-scoped metrics for a member', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/intelligence/company/${companyId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.companyId).toBe(companyId);
      expect(res.body.topProducts.some((p: { id: string }) => p.id === productId)).toBe(true);
      expect(res.body.topStores.some((s: { id: string }) => s.id === storeId)).toBe(true);
      expect(res.body.topSearches.some((s: { id: string }) => s.id === 'arroz-e2e')).toBe(true);
      expect(res.body.demandGap.totalViews).toBeGreaterThanOrEqual(2);
      expect(res.body.demandGap.totalContacts).toBeGreaterThanOrEqual(1);
      expect(res.body.demandGap.conversionRate).toBeGreaterThan(0);
    });

    it('requires authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/intelligence/company/${companyId}`)
        .expect(401);
    });

    it('rejects non-members', async () => {
      await request(app.getHttpServer())
        .get(`/api/intelligence/company/${companyId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });

  describe('Platform Intelligence', () => {
    it('requires ADMIN or SUPER_ADMIN', async () => {
      await request(app.getHttpServer())
        .get('/api/intelligence/platform')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('returns platform-wide metrics for an admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/intelligence/platform')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.totals).toBeDefined();
      expect(res.body.totals.totalEvents).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.topProducts)).toBe(true);
      expect(Array.isArray(res.body.topCompanies)).toBe(true);
      expect(res.body.demandGap).toBeDefined();
    });

    it('requires authentication', async () => {
      await request(app.getHttpServer()).get('/api/intelligence/platform').expect(401);
    });
  });
});
