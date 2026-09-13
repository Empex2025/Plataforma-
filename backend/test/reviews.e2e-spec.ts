import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/db/prisma.service.js';
import {
  seedCompanyStoreProduct,
  registerAndLogin,
  promoteToAdmin,
  cleanupCompanyAndUsers,
} from './support/e2e.helpers.js';

describe('Reviews (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let companyId: string;
  let storeId: string;
  let productId: string;
  let product2Id: string;
  let product3Id: string;
  let userIds: string[] = [];
  let consumerToken: string;
  let consumerId: string;
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    prisma = app.get(PrismaService);

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entities = await seedCompanyStoreProduct(prisma, suffix);
    companyId = entities.companyId;
    storeId = entities.storeId;
    productId = entities.productId;

    const product2 = await prisma.product.create({
      data: { companyId, name: `P2-${suffix}`, slug: `p2-${suffix}`, status: 'ACTIVE' },
    });
    product2Id = product2.id;

    const product3 = await prisma.product.create({
      data: { companyId, name: `P3-${suffix}`, slug: `p3-${suffix}`, status: 'ACTIVE' },
    });
    product3Id = product3.id;

    const consumer = await registerAndLogin(app, `review-consumer-${suffix}@test.com`, 'password123', 'Consumer');
    consumerToken = consumer.token;
    consumerId = consumer.userId;
    userIds.push(consumerId);

    const admin = await registerAndLogin(app, `review-admin-${suffix}@test.com`, 'password123', 'Admin');
    adminToken = admin.token;
    adminId = admin.userId;
    userIds.push(adminId);
    await promoteToAdmin(prisma, `review-admin-${suffix}@test.com`);
  }, 30_000);

  afterAll(async () => {
    await cleanupCompanyAndUsers(prisma, companyId, userIds);
    await app.close();
  });

  describe('POST /api/reviews', () => {
    it('should create a review with status PENDING', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send({ targetType: 'PRODUCT', targetId: productId, rating: 5, title: 'Great product', comment: 'Loved it' });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('PENDING');
      expect(res.body.rating).toBe(5);
    });

    it('should throw ConflictException for duplicate review', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send({ targetType: 'PRODUCT', targetId: productId, rating: 4 });

      expect(res.status).toBe(409);
    });

    it('should throw UnauthorizedException without token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reviews')
        .send({ targetType: 'PRODUCT', targetId: productId, rating: 3 });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/reviews/public/PRODUCT/:id', () => {
    it('should not show PENDING reviews', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reviews/public/PRODUCT/${productId}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('PATCH /api/reviews/:id/moderate', () => {
    let reviewId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send({ targetType: 'PRODUCT', targetId: product2Id, rating: 4, title: 'Moderate me' });
      reviewId = res.body.id;
    });

    it('should throw ForbiddenException for non-admin', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/reviews/${reviewId}/moderate`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .send({ decision: 'APPROVED' });

      expect(res.status).toBe(403);
    });

    it('should approve a review and compute rating', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/reviews/${reviewId}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'APPROVED', note: 'Looks good' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('APPROVED');

      const product = await prisma.product.findUnique({ where: { id: product2Id } });
      expect(product!.ratingCount).toBeGreaterThanOrEqual(1);
    });

    it('should throw BadRequestException when review is not PENDING', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/reviews/${reviewId}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'REJECTED' });

      expect(res.status).toBe(400);
    });

    it('should throw ForbiddenException when moderating own review', async () => {
      const selfRes = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetType: 'STORE', targetId: storeId, rating: 3 });
      const selfReviewId = selfRes.body.id;

      const res = await request(app.getHttpServer())
        .patch(`/api/reviews/${selfReviewId}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'APPROVED' });

      expect(res.status).toBe(403);

      await prisma.review.delete({ where: { id: selfReviewId } });
    });
  });

  describe('GET /api/reviews/public/PRODUCT/:id (after approval)', () => {
    it('should show approved reviews without userId or status', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reviews/public/PRODUCT/${product2Id}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].userId).toBeUndefined();
      expect(res.body[0].status).toBeUndefined();
      expect(res.body[0].rating).toBeDefined();
    });
  });

  describe('GET /api/reviews/moderation', () => {
    it('should return pending reviews for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reviews/moderation')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
    });

    it('should throw ForbiddenException for non-admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reviews/moderation')
        .set('Authorization', `Bearer ${consumerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/reviews/mine', () => {
    it('should return reviews for the authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reviews/mine')
        .set('Authorization', `Bearer ${consumerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PATCH /api/reviews/:id', () => {
    let reviewId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send({ targetType: 'PRODUCT', targetId: product3Id, rating: 3, title: 'Editable' });
      reviewId = res.body.id;
    });

    it('should update review and reset to PENDING', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .send({ rating: 2, title: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PENDING');
      expect(res.body.rating).toBe(2);
    });

    it('should throw ForbiddenException for other user review', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rating: 1 });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    let reviewId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send({ targetType: 'STORE', targetId: storeId, rating: 1, title: 'Delete me' });
      reviewId = res.body.id;
    });

    it('should delete own review', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${consumerToken}`);

      expect(res.status).toBe(200);
    });

    it('should return 404 for deleted review', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reviews/public/PRODUCT/${product3Id}`)
        .query({});

      expect(res.status).toBe(200);
      const found = res.body.find((r: { id: string }) => r.id === reviewId);
      expect(found).toBeUndefined();
    });
  });
});
