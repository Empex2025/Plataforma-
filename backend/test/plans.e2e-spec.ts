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

describe('Plans (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = 'E2eT3stPass!';
  const ownerEmail = `e2e-plans-owner-${suffix}@example.com`;
  const adminEmail = `e2e-plans-admin-${suffix}@example.com`;
  const memberAEmail = `e2e-plans-memA-${suffix}@example.com`;
  const memberBEmail = `e2e-plans-memB-${suffix}@example.com`;

  let ownerToken: string;
  let adminToken: string;
  let ownerId: string;
  let adminId: string;
  let memberAId: string;
  let memberBId: string;
  let companyId: string;

  let freePlanId: string;
  let proPlanId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    const owner = await registerAndLogin(app, ownerEmail, password);
    ownerToken = owner.token;
    ownerId = owner.userId;

    const admin = await registerAndLogin(app, adminEmail, password);
    adminId = admin.userId;
    await promoteToAdmin(prisma, adminEmail);
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password });
    adminToken = adminLogin.body.token;

    const memberA = await registerAndLogin(app, memberAEmail, password);
    memberAId = memberA.userId;
    const memberB = await registerAndLogin(app, memberBEmail, password);
    memberBId = memberB.userId;

    ({ companyId } = await seedCompanyStoreProduct(prisma, `${suffix}`));
    await addCompanyMember(prisma, ownerId, companyId, 'MERCHANT_OWNER');

    const free = await prisma.plan.upsert({
      where: { tier: 'FREE' },
      update: { maxStores: 1, maxProducts: 100, maxImports: 3, maxMembers: 2, analytics: false, alerts: false, active: true },
      create: { tier: 'FREE', name: 'Gratuito', maxStores: 1, maxProducts: 100, maxImports: 3, maxMembers: 2, analytics: false, alerts: false },
    });
    const pro = await prisma.plan.upsert({
      where: { tier: 'PRO' },
      update: { maxStores: 5, maxProducts: 1000, maxImports: 20, maxMembers: 10, analytics: true, alerts: true, active: true },
      create: { tier: 'PRO', name: 'Profissional', maxStores: 5, maxProducts: 1000, maxImports: 20, maxMembers: 10, analytics: true, alerts: true },
    });
    await prisma.plan.upsert({
      where: { tier: 'PREMIUM' },
      update: { maxStores: 50, maxProducts: 10000, maxImports: 100, maxMembers: 50, analytics: true, alerts: true, active: true },
      create: { tier: 'PREMIUM', name: 'Premium', maxStores: 50, maxProducts: 10000, maxImports: 100, maxMembers: 50, analytics: true, alerts: true },
    });

    freePlanId = free.id;
    proPlanId = pro.id;
  });

  afterAll(async () => {
    await cleanupCompanyAndUsers(prisma, companyId, [ownerId, adminId, memberAId, memberBId]);
    await app.close();
  });

  describe('GET /api/plans', () => {
    it('lists available plans publicly', async () => {
      const res = await request(app.getHttpServer()).get('/api/plans').expect(200);
      const tiers = res.body.map((p: { tier: string }) => p.tier);
      expect(tiers).toEqual(expect.arrayContaining(['FREE', 'PRO', 'PREMIUM']));
    });
  });

  describe('Company plan assignment', () => {
    it('returns 404 before any plan is assigned', async () => {
      await request(app.getHttpServer())
        .get(`/api/plans/company/${companyId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('rejects plan assignment by a non-admin', async () => {
      await request(app.getHttpServer())
        .post(`/api/plans/company/${companyId}/assign`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ planId: proPlanId })
        .expect(403);
    });

    it('requires authentication to assign a plan', async () => {
      await request(app.getHttpServer())
        .post(`/api/plans/company/${companyId}/assign`)
        .send({ planId: proPlanId })
        .expect(401);
    });

    it('rejects an unknown plan', async () => {
      await request(app.getHttpServer())
        .post(`/api/plans/company/${companyId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ planId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('assigns PRO to the company as admin', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/plans/company/${companyId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ planId: proPlanId })
        .expect(201);

      expect(res.body.plan.tier).toBe('PRO');
    });

    it('returns the assigned company plan', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/plans/company/${companyId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body.companyId).toBe(companyId);
      expect(res.body.plan.tier).toBe('PRO');
    });
  });

  describe('Plan usage', () => {
    it('reports usage against the assigned plan', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/plans/company/${companyId}/usage`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body.planTier).toBe('PRO');
      expect(res.body.stores.current).toBe(1);
      expect(res.body.stores.limit).toBe(5);
      expect(res.body.products.current).toBe(1);
      expect(res.body.products.limit).toBe(1000);
      expect(res.body.members.current).toBe(1);
      expect(res.body.members.limit).toBe(10);
    });
  });

  describe('Plan limit enforcement', () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .post(`/api/plans/company/${companyId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ planId: freePlanId })
        .expect(201);
    });

    it('blocks creating a store beyond the FREE limit', async () => {
      await request(app.getHttpServer())
        .post('/api/stores')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('X-Company-Id', companyId)
        .send({ name: 'Extra Store', lat: -3.7, lng: -38.5 })
        .expect(403);
    });

    it('allows adding a member up to the FREE limit', async () => {
      await request(app.getHttpServer())
        .post(`/api/companies/${companyId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: memberAEmail, role: 'MERCHANT_MANAGER' })
        .expect(201);
    });

    it('blocks adding a member beyond the FREE limit', async () => {
      await request(app.getHttpServer())
        .post(`/api/companies/${companyId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: memberBEmail, role: 'MERCHANT_MANAGER' })
        .expect(403);
    });
  });
});
