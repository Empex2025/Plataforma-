import request from 'supertest';
import { randomUUID } from 'node:crypto';
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

describe('Security regression (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = 'E2eT3stPass!';

  let adminToken: string;
  let adminId: string;
  let userA: { token: string; userId: string };
  let userB: { token: string; userId: string };

  let companyA: string;
  let companyB: string;
  let productA: string;
  let companySlugA: string;
  let storeSlugA: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    const adminEmail = `sec-admin-${suffix}@example.com`;
    const admin = await registerAndLogin(app, adminEmail, password);
    adminId = admin.userId;
    await promoteToAdmin(prisma, adminEmail);
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password });
    adminToken = adminLogin.body.token;

    userA = await registerAndLogin(app, `sec-a-${suffix}@example.com`, password);
    userB = await registerAndLogin(app, `sec-b-${suffix}@example.com`, password);

    const entA = await seedCompanyStoreProduct(prisma, `sec-a-${suffix}`);
    companyA = entA.companyId;
    productA = entA.productId;
    companySlugA = `e2e-co-sec-a-${suffix}`;
    storeSlugA = `e2e-store-sec-a-${suffix}`;
    await addCompanyMember(prisma, userA.userId, companyA, 'MERCHANT_OWNER');

    const entB = await seedCompanyStoreProduct(prisma, `sec-b-${suffix}`);
    companyB = entB.companyId;
    await addCompanyMember(prisma, userB.userId, companyB, 'MERCHANT_OWNER');
  });

  afterAll(async () => {
    await cleanupCompanyAndUsers(prisma, companyA, [userA.userId]);
    await cleanupCompanyAndUsers(prisma, companyB, [userB.userId]);
    await prisma.user.deleteMany({ where: { id: adminId } }).catch(() => undefined);
    await app.close();
  });

  it('rejects unauthenticated access to protected endpoints', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    await request(app.getHttpServer()).get('/api/notifications').expect(401);
  });

  it('does not allow privilege escalation through registration', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: `sec-priv-${suffix}@example.com`, name: 'x', password, role: 'ADMIN' })
      .expect(400);
  });

  it('never leaks password hashes in auth responses', async () => {
    const email = `sec-leak-${suffix}@example.com`;
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, name: 'Leak', password })
      .expect(201);

    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|password_hash/i);
    expect(res.body.user).not.toHaveProperty('passwordHash');

    await prisma.user.deleteMany({ where: { email } });
  });

  it('rejects invalid enums with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/events')
      .send({ type: 'NOT_A_REAL_EVENT' })
      .expect(400);
  });

  it('treats SQL injection payloads as inert (no 5xx)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: "' OR 1=1--", password: "' OR '1'='1" });

    expect(res.status).toBeLessThan(500);
    expect([400, 401]).toContain(res.status);
  });

  it('rejects malformed UUIDs on path params (400, not 500)', async () => {
    await request(app.getHttpServer())
      .post('/api/notifications/not-a-uuid/read')
      .set('Authorization', `Bearer ${userA.token}`)
      .expect(400);
  });

  it('blocks cross-company access', async () => {
    await request(app.getHttpServer())
      .get('/api/imports')
      .set('Authorization', `Bearer ${userA.token}`)
      .set('x-company-id', companyB)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/analytics/company/${companyB}`)
      .set('Authorization', `Bearer ${userA.token}`)
      .expect(403);
  });

  it('restricts admin-only endpoints', async () => {
    await request(app.getHttpServer())
      .get('/api/experiments')
      .set('Authorization', `Bearer ${userA.token}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/experiments')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('prevents cross-user notification access (IDOR)', async () => {
    const notification = await prisma.notification.create({
      data: {
        userId: userA.userId,
        type: 'TEST',
        title: 'Private',
        message: 'Private message',
      },
    });

    await request(app.getHttpServer())
      .post(`/api/notifications/${notification.id}/read`)
      .set('Authorization', `Bearer ${userB.token}`)
      .expect(403);
  });

  it('prevents cross-user review deletion (IDOR)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/reviews')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ targetType: 'PRODUCT', targetId: productA, rating: 5, comment: 'ok' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/reviews/${created.body.id}`)
      .set('Authorization', `Bearer ${userB.token}`)
      .expect(403);
  });

  it('prevents cross-company campaign access (IDOR)', async () => {
    await prisma.plan.update({ where: { tier: 'PREMIUM' }, data: { advertising: true } }).catch(() => undefined);
    await assignPlanToCompany(prisma, companyA, 'PREMIUM');

    const campaign = await request(app.getHttpServer())
      .post('/api/advertising/campaigns')
      .set('Authorization', `Bearer ${userA.token}`)
      .set('x-company-id', companyA)
      .send({ name: 'Security Campaign' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .patch(`/api/advertising/campaigns/${campaign.body.id}`)
      .set('Authorization', `Bearer ${userB.token}`)
      .set('x-company-id', companyB)
      .send({ name: 'Hijacked' });

    expect([403, 404]).toContain(res.status);
  });

  it('enforces plan gating (no advertising on FREE)', async () => {
    await request(app.getHttpServer())
      .post('/api/advertising/campaigns')
      .set('Authorization', `Bearer ${userB.token}`)
      .set('x-company-id', companyB)
      .send({ name: 'Should fail' })
      .expect(403);
  });

  it('rejects oversized pagination', async () => {
    await request(app.getHttpServer())
      .get('/api/search/products?limit=100000')
      .expect(400);
  });

  it('does not expose private identifiers on public endpoints', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/public/stores/${companySlugA}/${storeSlugA}`)
      .expect(200);

    expect(JSON.stringify(res.body)).not.toMatch(/userId|passwordHash/);
  });

  it('rejects favorites for a non-existent target', async () => {
    await request(app.getHttpServer())
      .post('/api/favorites')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ targetType: 'PRODUCT', targetId: randomUUID() })
      .expect(404);
  });

  it('sanitizes uploaded file names against path traversal', async () => {
    await assignPlanToCompany(prisma, companyA, 'PREMIUM').catch(() => undefined);

    const res = await request(app.getHttpServer())
      .post('/api/imports')
      .set('Authorization', `Bearer ${userA.token}`)
      .set('x-company-id', companyA)
      .attach('file', Buffer.from('name,price\nProduto,10\n'), {
        filename: '../../etc/passwd.csv',
        contentType: 'text/csv',
      });

    expect([202, 503]).toContain(res.status);

    const job = await prisma.importJob.findFirst({
      where: { companyId: companyA },
      orderBy: { createdAt: 'desc' },
    });
    const prefix = `imports/${companyA}/`;
    expect(job?.fileKey.startsWith(prefix)).toBe(true);
    expect(job?.fileKey.slice(prefix.length)).not.toContain('/');
    expect(job?.fileKey).not.toContain('../');
  });
});
