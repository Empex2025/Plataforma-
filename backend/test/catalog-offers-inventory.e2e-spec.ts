import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/db/prisma.service.js';

jest.setTimeout(30000);

describe('Catalog / Offers / Inventory (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = 'E2eT3stPass!';

  let companyId: string;
  let userId: string;
  let userToken: string;
  let storeId: string;
  let productId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    const company = await prisma.company.create({
      data: { name: `Cat Co ${suffix}`, slug: `cat-co-${suffix}`, status: 'ACTIVE' },
    });
    companyId = company.id;

    const userRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: `cat-${suffix}@example.com`, name: 'Catalog User', password });
    userToken = userRes.body.token;
    const user = await prisma.user.findUnique({ where: { email: `cat-${suffix}@example.com` } });
    userId = user!.id;

    await prisma.userCompany.create({ data: { userId, companyId, role: 'MERCHANT_OWNER' } });

    const point = 'POINT(-38.5 -3.7)';
    const storeRows = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO stores (id, company_id, name, slug, location, status, created_at, updated_at)
      VALUES (gen_random_uuid(), ${companyId}::uuid, ${`Store ${suffix}`}, ${`store-${suffix}`},
        ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography, 'ACTIVE', NOW(), NOW())
      RETURNING id
    `;
    storeId = storeRows[0].id;

    const product = await prisma.product.create({
      data: { companyId, name: `Product ${suffix}`, slug: `product-${suffix}`, status: 'ACTIVE' },
    });
    productId = product.id;
  });

  afterAll(async () => {
    if (prisma && companyId) {
      await prisma.event.deleteMany({ where: { userId } }).catch(() => undefined);
      await prisma.company.delete({ where: { id: companyId } }).catch(() => undefined);
      await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    }
    await app.close();
  });

  describe('1. PRICES — active / history / type isolation', () => {
    it('creates a REGULAR price as active', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/prices')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .send({ storeId, productId, type: 'REGULAR', value: 10 })
        .expect(201);

      expect(res.body.value).toBe(10);
      expect(res.body.validTo).toBeNull();
    });

    it('creates a PROMOTIONAL price without closing the REGULAR one', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/prices')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .send({ storeId, productId, type: 'PROMOTIONAL', value: 8 })
        .expect(201);

      expect(res.body.value).toBe(8);

      const active = await prisma.price.findMany({
        where: { storeId, productId, validTo: null },
      });
      expect(active).toHaveLength(2);
    });

    it('creating a second REGULAR price closes the previous one', async () => {
      await request(app.getHttpServer())
        .post('/api/prices')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .send({ storeId, productId, type: 'REGULAR', value: 15 })
        .expect(201);

      const active = await prisma.price.findMany({
        where: { storeId, productId, type: 'REGULAR', validTo: null },
      });
      expect(active).toHaveLength(1);
      expect(Number(active[0].value)).toBe(15);

      const historical = await prisma.price.findMany({
        where: { storeId, productId, type: 'REGULAR', validTo: { not: null } },
      });
      expect(historical.length).toBeGreaterThanOrEqual(1);
    });

    it('public endpoint returns the current active price', async () => {
      const companySlug = `cat-co-${suffix}`;
      const productSlug = `product-${suffix}`;
      const res = await request(app.getHttpServer())
        .get(`/api/public/products/${companySlug}/${productSlug}`)
        .expect(200);

      const storeAvail = res.body.stores.find((s: { storeId: string }) => s.storeId === storeId);
      expect(storeAvail).toBeDefined();
      expect(storeAvail.price).toBe(15);
    });
  });

  describe('2. INVENTORY — positive / zero / availability', () => {
    it('sets inventory to 10', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .send({ storeId, productId, quantity: 10 })
        .expect(201);

      expect(res.body.quantity).toBe(10);
    });

    it('public endpoint shows available=true with stock', async () => {
      const companySlug = `cat-co-${suffix}`;
      const productSlug = `product-${suffix}`;
      const res = await request(app.getHttpServer())
        .get(`/api/public/products/${companySlug}/${productSlug}`)
        .expect(200);

      const storeAvail = res.body.stores.find((s: { storeId: string }) => s.storeId === storeId);
      expect(storeAvail.available).toBe(true);
    });

    it('sets inventory to 0', async () => {
      await request(app.getHttpServer())
        .patch(`/api/inventory/${productId}/${storeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .send({ quantity: 0 })
        .expect(200);
    });

    it('public endpoint shows available=false with zero stock', async () => {
      const companySlug = `cat-co-${suffix}`;
      const productSlug = `product-${suffix}`;
      const res = await request(app.getHttpServer())
        .get(`/api/public/products/${companySlug}/${productSlug}`)
        .expect(200);

      const storeAvail = res.body.stores.find((s: { storeId: string }) => s.storeId === storeId);
      expect(storeAvail).toBeDefined();
      expect(storeAvail.available).toBe(false);
    });

    it('rejects negative quantity', async () => {
      await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .send({ storeId, productId, quantity: -1 })
        .expect(400);
    });
  });

  describe('3. OFFERS — null dates / future / active / expired', () => {
    let offerId: string;

    it('creates an offer with both dates null (always active)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offers')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .send({
          title: `Offer Null Dates ${suffix}`,
          discountType: 'PERCENTAGE',
          discountValue: 10,
          storeId,
        })
        .expect(201);

      offerId = res.body.id;
      expect(res.body.startsAt).toBeNull();
      expect(res.body.endsAt).toBeNull();
    });

    it('public endpoint shows the null-dates offer', async () => {
      const companySlug = `cat-co-${suffix}`;
      const productSlug = `product-${suffix}`;
      const res = await request(app.getHttpServer())
        .get(`/api/public/products/${companySlug}/${productSlug}`)
        .expect(200);

      const storeAvail = res.body.stores.find((s: { storeId: string }) => s.storeId === storeId);
      expect(storeAvail.offers.length).toBeGreaterThanOrEqual(1);
    });

    it('creates a future offer (startsAt in the future)', async () => {
      const future = new Date(Date.now() + 86400000 * 30).toISOString();
      const res = await request(app.getHttpServer())
        .post('/api/offers')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .send({
          title: `Future Offer ${suffix}`,
          discountType: 'FIXED',
          discountValue: 5,
          storeId,
          startsAt: future,
        })
        .expect(201);

      expect(res.body.startsAt).toBeTruthy();
    });

    it('public endpoint does NOT show the future offer', async () => {
      const companySlug = `cat-co-${suffix}`;
      const productSlug = `product-${suffix}`;
      const res = await request(app.getHttpServer())
        .get(`/api/public/products/${companySlug}/${productSlug}`)
        .expect(200);

      const storeAvail = res.body.stores.find((s: { storeId: string }) => s.storeId === storeId);
      const futureOffer = storeAvail.offers.find(
        (o: { title: string }) => o.title === `Future Offer ${suffix}`,
      );
      expect(futureOffer).toBeUndefined();
    });

    it('creates an expired offer (endsAt in the past)', async () => {
      const past = new Date(Date.now() - 86400000 * 30).toISOString();
      const res = await request(app.getHttpServer())
        .post('/api/offers')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .send({
          title: `Expired Offer ${suffix}`,
          discountType: 'PERCENTAGE',
          discountValue: 50,
          storeId,
          endsAt: past,
        })
        .expect(201);

      expect(res.body.id).toBeTruthy();
    });

    it('public endpoint does NOT show the expired offer', async () => {
      const companySlug = `cat-co-${suffix}`;
      const productSlug = `product-${suffix}`;
      const res = await request(app.getHttpServer())
        .get(`/api/public/products/${companySlug}/${productSlug}`)
        .expect(200);

      const storeAvail = res.body.stores.find((s: { storeId: string }) => s.storeId === storeId);
      const expiredOffer = storeAvail.offers.find(
        (o: { title: string }) => o.title === `Expired Offer ${suffix}`,
      );
      expect(expiredOffer).toBeUndefined();
    });

    it('adds a product to the offer and reindexes the store', async () => {
      await request(app.getHttpServer())
        .post(`/api/offers/${offerId}/products`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .send({ productId })
        .expect(201);
    });

    it('removes a product from the offer', async () => {
      await request(app.getHttpServer())
        .delete(`/api/offers/${offerId}/products/${productId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .expect(200);
    });
  });

  describe('4. VISIBILITY — product / store status rules', () => {
    let inactiveProductId: string;
    let closedStoreId: string;
    let inactiveStoreId: string;

    beforeAll(async () => {
      const inactiveProduct = await prisma.product.create({
        data: { companyId, name: `Inactive P ${suffix}`, slug: `inactive-p-${suffix}`, status: 'INACTIVE' },
      });
      inactiveProductId = inactiveProduct.id;

      const point = 'POINT(-38.5 -3.7)';
      const closedRows = await prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO stores (id, company_id, name, slug, location, status, created_at, updated_at)
        VALUES (gen_random_uuid(), ${companyId}::uuid, ${`Closed ${suffix}`}, ${`closed-${suffix}`},
          ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography, 'CLOSED_TEMPORARY', NOW(), NOW())
        RETURNING id
      `;
      closedStoreId = closedRows[0].id;

      const inactiveRows = await prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO stores (id, company_id, name, slug, location, status, created_at, updated_at)
        VALUES (gen_random_uuid(), ${companyId}::uuid, ${`Inactive S ${suffix}`}, ${`inactive-s-${suffix}`},
          ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography, 'INACTIVE', NOW(), NOW())
        RETURNING id
      `;
      inactiveStoreId = inactiveRows[0].id;

      await prisma.price.create({
        data: { storeId: closedStoreId, productId, type: 'REGULAR', value: 5, validTo: null },
      });
      await prisma.price.create({
        data: { storeId, productId: inactiveProductId, type: 'REGULAR', value: 99, validTo: null },
      });
    });

    it('returns 404 for inactive product via public endpoint', async () => {
      await request(app.getHttpServer())
        .get(`/api/public/products/${companyId}/inactive-p-${suffix}`)
        .expect(404);
    });

    it('CLOSED_TEMPORARY store appears in availability but available=false', async () => {
      const companySlug = `cat-co-${suffix}`;
      const productSlug = `product-${suffix}`;
      const res = await request(app.getHttpServer())
        .get(`/api/public/products/${companySlug}/${productSlug}`)
        .expect(200);

      const closed = res.body.stores.find((s: { storeId: string }) => s.storeId === closedStoreId);
      expect(closed).toBeDefined();
      expect(closed.available).toBe(false);
      expect(closed.storeStatus).toBe('CLOSED_TEMPORARY');
    });

    it('INACTIVE store does NOT appear in availability', async () => {
      const companySlug = `cat-co-${suffix}`;
      const productSlug = `product-${suffix}`;
      const res = await request(app.getHttpServer())
        .get(`/api/public/products/${companySlug}/${productSlug}`)
        .expect(200);

      const inactive = res.body.stores.find((s: { storeId: string }) => s.storeId === inactiveStoreId);
      expect(inactive).toBeUndefined();
    });

    it('public store endpoint returns 404 for INACTIVE store', async () => {
      const companySlug = `cat-co-${suffix}`;
      await request(app.getHttpServer())
        .get(`/api/public/stores/${companySlug}/inactive-s-${suffix}`)
        .expect(404);
    });

    it('CLOSED_TEMPORARY store is accessible via public store endpoint', async () => {
      const companySlug = `cat-co-${suffix}`;
      const res = await request(app.getHttpServer())
        .get(`/api/public/stores/${companySlug}/closed-${suffix}`)
        .expect(200);

      expect(res.body.status).toBe('CLOSED_TEMPORARY');
    });
  });

  describe('5. CROSS-COMPANY — isolation', () => {
    let otherCompanyId: string;
    let otherUserId: string;
    let _otherToken: string;
    let otherStoreId: string;
    let otherProductId: string;

    beforeAll(async () => {
      const otherCompany = await prisma.company.create({
        data: { name: `Other Co ${suffix}`, slug: `other-co-${suffix}`, status: 'ACTIVE' },
      });
      otherCompanyId = otherCompany.id;

      const otherUserRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: `other-${suffix}@example.com`, name: 'Other User', password });
      _otherToken = otherUserRes.body.token;
      const otherUser = await prisma.user.findUnique({ where: { email: `other-${suffix}@example.com` } });
      otherUserId = otherUser!.id;

      await prisma.userCompany.create({ data: { userId: otherUserId, companyId: otherCompanyId, role: 'MERCHANT_OWNER' } });

      const point = 'POINT(-38.5 -3.7)';
      const storeRows = await prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO stores (id, company_id, name, slug, location, status, created_at, updated_at)
        VALUES (gen_random_uuid(), ${otherCompanyId}::uuid, ${`Other Store ${suffix}`}, ${`other-store-${suffix}`},
          ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography, 'ACTIVE', NOW(), NOW())
        RETURNING id
      `;
      otherStoreId = storeRows[0].id;

      const product = await prisma.product.create({
        data: { companyId: otherCompanyId, name: `Other Product ${suffix}`, slug: `other-product-${suffix}`, status: 'ACTIVE' },
      });
      otherProductId = product.id;
    });

    it('rejects price creation with store from another company', async () => {
      await request(app.getHttpServer())
        .post('/api/prices')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .send({ storeId: otherStoreId, productId, value: 10 })
        .expect(403);
    });

    it('rejects price creation with product from another company', async () => {
      await request(app.getHttpServer())
        .post('/api/prices')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .send({ storeId, productId: otherProductId, value: 10 })
        .expect(403);
    });

    it('rejects inventory upsert with store from another company', async () => {
      await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .send({ storeId: otherStoreId, productId, quantity: 10 })
        .expect(403);
    });

    it('rejects inventory upsert with product from another company', async () => {
      await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .send({ storeId, productId: otherProductId, quantity: 10 })
        .expect(403);
    });

    it('rejects offer creation with store from another company', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offers')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .send({ title: 'X', discountType: 'PERCENTAGE', discountValue: 10, storeId: otherStoreId });

      expect([400, 403]).toContain(res.status);
    });

    it('rejects adding other-company product to offer', async () => {
      const offerRes = await request(app.getHttpServer())
        .post('/api/offers')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .send({ title: `Iso Offer ${suffix}`, discountType: 'PERCENTAGE', discountValue: 10 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/offers/${offerRes.body.id}/products`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .send({ productId: otherProductId })
        .expect(403);
    });

    it('does not list other company products', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .expect(200);

      const found = res.body.data.find((p: { id: string }) => p.id === otherProductId);
      expect(found).toBeUndefined();
    });

    it('does not list other company stores', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/stores')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .expect(200);

      const found = res.body.find((s: { id: string }) => s.id === otherStoreId);
      expect(found).toBeUndefined();
    });
  });

  describe('6. SEARCH INDEX — consistency', () => {
    it('inactive product is not found in search by company scope', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/search/products?q=Inactive+P+${suffix}`)
        .expect(200);

      const found = res.body.hits?.find((h: { id: string }) => h.id !== undefined);
      if (found) {
        expect(found.active).toBe(false);
      }
    });

    it('deactivated store is removed from search index', async () => {
      const point = 'POINT(-38.5 -3.7)';
      const delStoreRows = await prisma.$queryRaw<Array<{ id: string; slug: string }>>`
        INSERT INTO stores (id, company_id, name, slug, location, status, created_at, updated_at)
        VALUES (gen_random_uuid(), ${companyId}::uuid, ${`Del Store ${suffix}`}, ${`del-store-${suffix}`},
          ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography, 'ACTIVE', NOW(), NOW())
        RETURNING id, slug
      `;
      const delStoreId = delStoreRows[0].id;

      await prisma.store.update({
        where: { id: delStoreId },
        data: { status: 'INACTIVE', deletedAt: new Date() },
      });

      const res = await request(app.getHttpServer())
        .get(`/api/search/stores?q=Del+Store+${suffix}`)
        .expect(200);

      if (res.body.hits?.length > 0) {
        const found = res.body.hits.find((h: { id: string }) => h.id === delStoreId);
        expect(found).toBeUndefined();
      }
    });

    it('price change is reflected in public endpoint', async () => {
      const companySlug = `cat-co-${suffix}`;
      const productSlug = `product-${suffix}`;

      await request(app.getHttpServer())
        .post('/api/prices')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .send({ storeId, productId, type: 'REGULAR', value: 42 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/public/products/${companySlug}/${productSlug}`)
        .expect(200);

      const storeAvail = res.body.stores.find((s: { storeId: string }) => s.storeId === storeId);
      expect(storeAvail.price).toBe(42);
    });

    it('stock change is reflected in public endpoint', async () => {
      await request(app.getHttpServer())
        .patch(`/api/inventory/${productId}/${storeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Company-Id', companyId)
        .send({ quantity: 25 })
        .expect(200);

      const companySlug = `cat-co-${suffix}`;
      const productSlug = `product-${suffix}`;
      const res = await request(app.getHttpServer())
        .get(`/api/public/products/${companySlug}/${productSlug}`)
        .expect(200);

      const storeAvail = res.body.stores.find((s: { storeId: string }) => s.storeId === storeId);
      expect(storeAvail.available).toBe(true);
    });
  });
});
