import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaService } from './../src/db/prisma.service.js';
import {
  addCompanyMember,
  assignPlanToCompany,
  cleanupCompanyAndUsers,
  createTestApp,
  registerAndLogin,
  seedCompanyStoreProduct,
} from './support/e2e.helpers.js';

describe('Conversions (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let userId: string;
  let authToken: string;
  let companyId: string;
  let campaignId: string;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = 'E2eT3stPass!';
  const email = `e2e-conv-${suffix}@example.com`;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    const user = await registerAndLogin(app, email, password);
    userId = user.userId;
    authToken = user.token;

    const entities = await seedCompanyStoreProduct(prisma, `conv-${suffix}`);
    companyId = entities.companyId;
    await prisma.plan.update({ where: { tier: 'PREMIUM' }, data: { advertising: true } }).catch(() => undefined);
    await assignPlanToCompany(prisma, companyId, 'PREMIUM');
    await addCompanyMember(prisma, userId, companyId, 'MERCHANT_OWNER');

    const campaignRes = await request(app.getHttpServer())
      .post('/api/advertising/campaigns')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-company-id', companyId)
      .send({ name: `Conv Campaign ${suffix}`, budget: 1000 });
    campaignId = campaignRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/advertising/campaigns/${campaignId}/activate`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-company-id', companyId)
      .expect(200);
  });

  afterAll(async () => {
    await cleanupCompanyAndUsers(prisma, companyId, [userId]);
    await app.close();
  });

  it('registers an organic conversion (no campaign)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/conversions')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-company-id', companyId)
      .send({ revenue: 42.5 })
      .expect(201);

    expect(res.body.companyId).toBe(companyId);
    expect(res.body.campaignId).toBeNull();
    expect(res.body.revenue).toBe(42.5);
  });

  it('registers attributed conversions and reflects revenue/ROAS in campaign metrics', async () => {
    for (const revenue of [100, 150]) {
      await request(app.getHttpServer())
        .post('/api/conversions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId)
        .send({ revenue, campaignId, attributionType: 'CLICK' })
        .expect(201);
    }

    const day = new Date();
    day.setHours(0, 0, 0, 0);
    await prisma.campaignMetric.update({
      where: { campaignId_date: { campaignId, date: day } },
      data: { spend: 50 },
    });
    await prisma.campaign.update({ where: { id: campaignId }, data: { spend: 50 } });

    const metrics = await request(app.getHttpServer())
      .get(`/api/advertising/campaigns/${campaignId}/metrics`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-company-id', companyId)
      .expect(200);

    expect(metrics.body.conversions).toBe(2);
    expect(metrics.body.revenue).toBe(250);
    expect(metrics.body.spend).toBe(50);
    expect(metrics.body.roas).toBe(5);

    const campaign = await request(app.getHttpServer())
      .get(`/api/advertising/campaigns/${campaignId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-company-id', companyId)
      .expect(200);

    expect(campaign.body.conversions).toBe(2);
    expect(campaign.body.revenue).toBe(250);
    expect(campaign.body.roas).toBe(5);
  });

  it('is idempotent by externalRef', async () => {
    const externalRef = `order-${suffix}`;

    const first = await request(app.getHttpServer())
      .post('/api/conversions')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-company-id', companyId)
      .send({ revenue: 10, campaignId, externalRef })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/api/conversions')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-company-id', companyId)
      .send({ revenue: 10, campaignId, externalRef })
      .expect(201);

    expect(second.body.id).toBe(first.body.id);
  });

  it('rejects a campaign from another company', async () => {
    await request(app.getHttpServer())
      .post('/api/conversions')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-company-id', companyId)
      .send({ revenue: 10, campaignId: randomUUID() })
      .expect(403);
  });

  it('lists conversions with pagination and campaign filter', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/conversions')
      .query({ campaignId, page: 1, limit: 2 })
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-company-id', companyId)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    for (const item of res.body.data) {
      expect(item.campaignId).toBe(campaignId);
    }
  });
});
