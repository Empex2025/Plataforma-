import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { PrismaService } from './../src/db/prisma.service.js';
import {
  addCompanyMember,
  cleanupCompanyAndUsers,
  createTestApp,
  registerAndLogin,
  seedCompanyStoreProduct,
} from './support/e2e.helpers.js';

describe('Interactions (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = 'E2eT3stPass!';
  const userEmail = `e2e-interactions-${suffix}@example.com`;
  const otherEmail = `e2e-interactions-other-${suffix}@example.com`;

  let userToken: string;
  let otherToken: string;
  let userId: string;
  let otherId: string;
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

    ({ companyId, storeId, productId } = await seedCompanyStoreProduct(prisma, `${suffix}`));
    await addCompanyMember(prisma, userId, companyId, 'MERCHANT_OWNER');
  });

  afterAll(async () => {
    await cleanupCompanyAndUsers(prisma, companyId, [userId, otherId]);
    await app.close();
  });

  describe('Events', () => {
    it('tracks an anonymous event', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/events')
        .send({ type: 'SEARCH', metadata: { query: 'arroz' } })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.userId).toBeNull();
    });

    it('tracks an authenticated event with a target', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'PRODUCT_VIEW', targetType: 'product', targetId: productId })
        .expect(201);

      expect(res.body.userId).toBe(userId);
      expect(res.body.targetId).toBe(productId);
    });

    it('rejects an invalid event type', async () => {
      await request(app.getHttpServer())
        .post('/api/events')
        .send({ type: 'NOT_A_TYPE' })
        .expect(400);
    });

    it('requires authentication to list events', async () => {
      await request(app.getHttpServer()).get('/api/events').expect(401);
    });

    it('lists the authenticated user events', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/events')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body.every((e: { userId: string }) => e.userId === userId)).toBe(true);
    });
  });

  describe('Favorites', () => {
    let productFavoriteId: string;

    it('adds a product to favorites', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/favorites')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ targetType: 'PRODUCT', targetId: productId })
        .expect(201);

      expect(res.body.targetType).toBe('PRODUCT');
      productFavoriteId = res.body.id;
    });

    it('rejects a duplicate favorite', async () => {
      await request(app.getHttpServer())
        .post('/api/favorites')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ targetType: 'PRODUCT', targetId: productId })
        .expect(409);
    });

    it('adds a store to favorites', async () => {
      await request(app.getHttpServer())
        .post('/api/favorites')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ targetType: 'STORE', targetId: storeId })
        .expect(201);
    });

    it('rejects a favorite for an unknown product', async () => {
      await request(app.getHttpServer())
        .post('/api/favorites')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ targetType: 'PRODUCT', targetId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('lists favorites and filters by targetType', async () => {
      const all = await request(app.getHttpServer())
        .get('/api/favorites')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(all.body.length).toBe(2);

      const productsOnly = await request(app.getHttpServer())
        .get('/api/favorites?targetType=PRODUCT')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(productsOnly.body.length).toBe(1);
    });

    it('requires authentication', async () => {
      await request(app.getHttpServer()).get('/api/favorites').expect(401);
    });

    it("cannot delete another user's favorite", async () => {
      const otherFavorite = await request(app.getHttpServer())
        .post('/api/favorites')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ targetType: 'PRODUCT', targetId: productId })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/favorites/${otherFavorite.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });

    it('removes own favorite', async () => {
      await request(app.getHttpServer())
        .delete(`/api/favorites/${productFavoriteId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/favorites?targetType=PRODUCT')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.length).toBe(0);
    });
  });

  describe('Contacts', () => {
    it('registers a WhatsApp contact intent', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contacts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ storeId, type: 'WHATSAPP', value: '5511999999999' })
        .expect(201);

      expect(res.body.storeId).toBe(storeId);
      expect(res.body.type).toBe('WHATSAPP');
    });

    it('rejects a contact for an unknown store', async () => {
      await request(app.getHttpServer())
        .post('/api/contacts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          storeId: '00000000-0000-0000-0000-000000000000',
          type: 'WHATSAPP',
          value: '5511999999999',
        })
        .expect(404);
    });

    it('lists the user contacts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/contacts')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('lists contacts of a store for a member', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/contacts/store/${storeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('hides store contacts from non-members', async () => {
      await request(app.getHttpServer())
        .get(`/api/contacts/store/${storeId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('requires authentication', async () => {
      await request(app.getHttpServer()).get('/api/contacts').expect(401);
    });
  });

  describe('Reviews', () => {
    let productReviewId: string;

    it('creates a pending product review', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ targetType: 'PRODUCT', targetId: productId, rating: 5, title: 'Ótimo', comment: 'Muito bom' })
        .expect(201);

      expect(res.body.status).toBe('PENDING');
      expect(res.body.rating).toBe(5);
      productReviewId = res.body.id;
    });

    it('rejects a duplicate review for the same target', async () => {
      await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ targetType: 'PRODUCT', targetId: productId, rating: 4 })
        .expect(409);
    });

    it('rejects an out-of-range rating', async () => {
      await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ targetType: 'STORE', targetId: storeId, rating: 6 })
        .expect(400);
    });

    it('creates a store review', async () => {
      await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ targetType: 'STORE', targetId: storeId, rating: 4 })
        .expect(201);
    });

    it('lists the user reviews', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reviews/mine')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.length).toBe(2);
    });

    it('does not expose pending reviews publicly', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reviews/public/PRODUCT/${productId}`)
        .expect(200);
      expect(res.body.length).toBe(0);
    });

    it('exposes approved reviews publicly', async () => {
      await prisma.review.update({
        where: { id: productReviewId },
        data: { status: 'APPROVED' },
      });

      const res = await request(app.getHttpServer())
        .get(`/api/reviews/public/PRODUCT/${productId}`)
        .expect(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe(productReviewId);
    });

    it('updates own review and resets it to pending', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/reviews/${productReviewId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ rating: 3, comment: 'Mudei de ideia' })
        .expect(200);

      expect(res.body.rating).toBe(3);
      expect(res.body.status).toBe('PENDING');
    });

    it("cannot update another user's review", async () => {
      await request(app.getHttpServer())
        .patch(`/api/reviews/${productReviewId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ rating: 1 })
        .expect(403);
    });

    it('deletes own review', async () => {
      await request(app.getHttpServer())
        .delete(`/api/reviews/${productReviewId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });

    it('requires authentication to delete', async () => {
      await request(app.getHttpServer())
        .delete(`/api/reviews/${productReviewId}`)
        .expect(401);
    });
  });
});
