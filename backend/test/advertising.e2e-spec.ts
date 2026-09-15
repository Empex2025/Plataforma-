import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { AppModule } from '@/app.module.js';
import { PrismaService } from '@/db/prisma.service.js';
import { createTestUser, createTestCompany, getAuthToken } from '../support/e2e.helpers.js';

describe('Advertising (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: string;
  let companyId: string;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE campaign_metrics CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE sponsored_items CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE campaigns CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE users CASCADE`;

    const user = await createTestUser(prisma, { role: 'COMPANY_OWNER' });
    userId = user.id;

    const company = await createTestCompany(prisma, userId);
    companyId = company.id;

    authToken = getAuthToken(userId);
  });

  describe('POST /advertising/campaigns', () => {
    it('should create a campaign when advertising is allowed', async () => {
      const response = await request(app.getHttpServer())
        .post('/advertising/campaigns')
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
      const freeUser = await createTestUser(prisma, { email: 'free@test.com', role: 'COMPANY_OWNER' });
      const freeCompany = await createTestCompany(prisma, freeUser.id, { plan: 'FREE' });
      const freeToken = getAuthToken(freeUser.id);

      const response = await request(app.getHttpServer())
        .post('/advertising/campaigns')
        .set('Authorization', `Bearer ${freeToken}`)
        .set('x-company-id', freeCompany.id)
        .send({
          name: 'Test Campaign',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /advertising/campaigns', () => {
    it('should list campaigns for the company', async () => {
      await request(app.getHttpServer())
        .post('/advertising/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId)
        .send({ name: 'Campaign 1' });

      await request(app.getHttpServer())
        .post('/advertising/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId)
        .send({ name: 'Campaign 2' });

      const response = await request(app.getHttpServer())
        .get('/advertising/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });
  });

  describe('POST /advertising/campaigns/:id/activate', () => {
    it('should activate a DRAFT campaign', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/advertising/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId)
        .send({ name: 'To Activate' });

      const campaignId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .post(`/advertising/campaigns/${campaignId}/activate`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ACTIVE');
    });
  });

  describe('POST /advertising/campaigns/:id/pause', () => {
    it('should pause an ACTIVE campaign', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/advertising/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId)
        .send({ name: 'To Pause' });

      const campaignId = createResponse.body.id;

      await request(app.getHttpServer())
        .post(`/advertising/campaigns/${campaignId}/activate`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId);

      const response = await request(app.getHttpServer())
        .post(`/advertising/campaigns/${campaignId}/pause`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('PAUSED');
    });
  });

  describe('GET /advertising/campaigns/:id/metrics', () => {
    it('should return metrics for a campaign', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/advertising/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId)
        .send({ name: 'With Metrics' });

      const campaignId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/advertising/campaigns/${campaignId}/metrics`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId);

      expect(response.status).toBe(200);
      expect(response.body.impressions).toBe(0);
      expect(response.body.clicks).toBe(0);
      expect(response.body.ctr).toBe(0);
    });
  });
});
