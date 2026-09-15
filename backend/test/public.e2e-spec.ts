import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/db/prisma.service.js';

describe('Public (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const companySlug = `pub-co-${suffix}`;
  const storeSlug = `pub-store-${suffix}`;
  const closedStoreSlug = `pub-closed-${suffix}`;
  const productSlug = `pub-product-${suffix}`;
  const inactiveProductSlug = `pub-inactive-${suffix}`;
  const categorySlug = `pub-cat-${suffix}`;

  let companyId: string;
  let storeId: string;
  let productId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    const company = await prisma.company.create({
      data: { name: `Public Co ${suffix}`, slug: companySlug, status: 'ACTIVE' },
    });
    companyId = company.id;

    const point = 'POINT(-38.5 -3.7)';
    const storeRows = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO stores (
        id, company_id, name, slug, location, status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${companyId}::uuid, ${`Store ${suffix}`}, ${storeSlug},
        ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography, 'ACTIVE', NOW(), NOW()
      )
      RETURNING id
    `;
    storeId = storeRows[0].id;

    const closedRows = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO stores (
        id, company_id, name, slug, location, status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${companyId}::uuid, ${`Closed ${suffix}`}, ${closedStoreSlug},
        ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography, 'CLOSED_TEMPORARY', NOW(), NOW()
      )
      RETURNING id
    `;
    const closedStoreId = closedRows[0].id;

    const category = await prisma.category.create({
      data: { name: `Category ${suffix}`, slug: categorySlug },
    });

    const brand = await prisma.brand.create({
      data: { companyId, name: `Brand ${suffix}`, slug: `brand-${suffix}` },
    });

    const product = await prisma.product.create({
      data: {
        companyId,
        brandId: brand.id,
        name: `Arroz ${suffix}`,
        slug: productSlug,
        status: 'ACTIVE',
        categories: { create: { categoryId: category.id } },
      },
    });
    productId = product.id;

    const inactiveProduct = await prisma.product.create({
      data: {
        companyId,
        name: `Inactive ${suffix}`,
        slug: inactiveProductSlug,
        status: 'INACTIVE',
      },
    });

    await prisma.price.create({
      data: {
        storeId,
        productId,
        type: 'REGULAR',
        value: 10.5,
        validTo: null,
      },
    });

    await prisma.price.create({
      data: {
        storeId: closedStoreId,
        productId,
        type: 'REGULAR',
        value: 3.0,
        validTo: null,
      },
    });

    await prisma.price.create({
      data: {
        storeId,
        productId: inactiveProduct.id,
        type: 'REGULAR',
        value: 99,
        validTo: null,
      },
    });

    await prisma.inventory.create({
      data: { storeId, productId, quantity: 5 },
    });

    const offer = await prisma.offer.create({
      data: {
        companyId,
        storeId,
        title: `Promo ${suffix}`,
        discountType: 'PERCENTAGE',
        discountValue: 10,
        status: 'ACTIVE',
        startsAt: null,
        endsAt: null,
      },
    });

    await prisma.offerProduct.create({
      data: { offerId: offer.id, productId },
    });
  });

  afterAll(async () => {
    if (prisma && companyId) {
      await prisma.company.delete({ where: { id: companyId } }).catch(() => undefined);
      await prisma.category
        .deleteMany({ where: { slug: categorySlug } })
        .catch(() => undefined);
    }
    await app.close();
  });

  describe('GET /api/public/products/:companySlug/:productSlug', () => {
    it('returns the public product with stores, price and offers', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/public/products/${companySlug}/${productSlug}`)
        .expect(200);

      expect(res.body.id).toBe(productId);
      expect(res.body.name).toBe(`Arroz ${suffix}`);
      expect(res.body.brand).toBeTruthy();
      expect(res.body.categories).toHaveLength(1);
      expect(res.body.stores.length).toBeGreaterThanOrEqual(1);

      const active = res.body.stores.find((s: { storeId: string }) => s.storeId === storeId);
      expect(active.price).toBe(10.5);
      expect(active.available).toBe(true);
      expect(active.offers.length).toBeGreaterThanOrEqual(1);

      expect(res.body.lowestPrice).toBe(10.5);
      expect(res.body.highestPrice).toBe(10.5);
    });

    it('returns distance when consumer coordinates are provided', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/public/products/${companySlug}/${productSlug}?lat=-3.7&lng=-38.5`)
        .expect(200);

      const active = res.body.stores.find((s: { storeId: string }) => s.storeId === storeId);
      expect(typeof active.distance).toBe('number');
    });

    it('returns 404 for an unknown slug', async () => {
      await request(app.getHttpServer())
        .get(`/api/public/products/${companySlug}/does-not-exist`)
        .expect(404);
    });

    it('returns 404 for a non-public (inactive) product', async () => {
      await request(app.getHttpServer())
        .get(`/api/public/products/${companySlug}/${inactiveProductSlug}`)
        .expect(404);
    });

    it('returns 400 for invalid coordinates', async () => {
      await request(app.getHttpServer())
        .get(`/api/public/products/${companySlug}/${productSlug}?lat=100&lng=-38.5`)
        .expect(400);
    });
  });

  describe('GET /api/public/products/:companySlug/:productSlug/compare', () => {
    it('compares stores and returns the lowest price', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/public/products/${companySlug}/${productSlug}/compare`)
        .expect(200);

      expect(res.body.product.id).toBe(productId);
      expect(res.body.stores.length).toBeGreaterThanOrEqual(2);
      expect(res.body.lowestPrice).toBe(10.5);
    });

    it('filters by radius and computes distance', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/public/products/${companySlug}/${productSlug}/compare?lat=-3.7&lng=-38.5&radius=50000&sort=distance`,
        )
        .expect(200);

      expect(res.body.nearestStore).toBeTruthy();
      expect(res.body.stores[0].distance).toBeDefined();
    });
  });

  describe('GET /api/public/stores/:companySlug/:storeSlug', () => {
    it('returns the public store with counts', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/public/stores/${companySlug}/${storeSlug}`)
        .expect(200);

      expect(res.body.id).toBe(storeId);
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.productCount).toBeGreaterThanOrEqual(1);
      expect(res.body.activeOfferCount).toBeGreaterThanOrEqual(1);
    });

    it('returns 404 for an unknown store slug', async () => {
      await request(app.getHttpServer())
        .get(`/api/public/stores/${companySlug}/does-not-exist`)
        .expect(404);
    });
  });

  describe('GET /api/public/stores/:companySlug/:storeSlug/products', () => {
    it('returns paginated public products', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/public/stores/${companySlug}/${storeSlug}/products?page=1&limit=10`)
        .expect(200);

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
      expect(Array.isArray(res.body.hits)).toBe(true);
      expect(res.body.hits.length).toBeGreaterThanOrEqual(1);
    });

    it('rejects limit above the maximum', async () => {
      await request(app.getHttpServer())
        .get(`/api/public/stores/${companySlug}/${storeSlug}/products?limit=100`)
        .expect(400);
    });
  });

  describe('GET /api/public/stores/:companySlug/:storeSlug/categories', () => {
    it('returns categories used by the store products', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/public/stores/${companySlug}/${storeSlug}/categories`)
        .expect(200);

      expect(res.body.categories.length).toBeGreaterThanOrEqual(1);
      const category = res.body.categories.find(
        (c: { slug: string }) => c.slug === categorySlug,
      );
      expect(category).toBeTruthy();
      expect(category.productCount).toBeGreaterThanOrEqual(1);
    });
  });
});
