import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/db/prisma.service.js';

jest.setTimeout(30000);

describe('Discovery (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const companySlug = `e2e-discovery-co-${suffix}`;
  const storeSlug = `e2e-discovery-store-${suffix}`;
  const productSlug = `e2e-discovery-product-${suffix}`;
  const tagSlug = `e2e-tag-${suffix}`;
  const productToken = `discoverytoken${suffix}`;

  let companyId: string;
  let storeId: string;
  let productId: string;
  let tagId: string;

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
      data: { name: `Discovery Co ${suffix}`, slug: companySlug, status: 'ACTIVE' },
    });
    companyId = company.id;

    const point = 'POINT(-55.6789 -12.3456)';
    const storeRows = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO stores (id, company_id, name, slug, location, status, city, state, created_at, updated_at)
      VALUES (
        gen_random_uuid(), ${companyId}::uuid, ${`Loja Discovery ${suffix}`}, ${storeSlug},
        ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography, 'ACTIVE', 'Fortaleza', 'CE', NOW(), NOW()
      )
      RETURNING id
    `;
    storeId = storeRows[0].id;

    const tag = await prisma.tag.create({
      data: { name: `Tag ${suffix}`, slug: tagSlug, group: 'attribute' },
    });
    tagId = tag.id;

    const product = await prisma.product.create({
      data: {
        companyId,
        name: `Produto ${productToken}`,
        slug: productSlug,
        description: 'Produto para teste de discovery E2E',
        status: 'ACTIVE',
        tags: { create: [{ tagId }] },
      },
    });
    productId = product.id;

    await prisma.price.create({
      data: { storeId, productId, type: 'REGULAR', value: 149.9, validTo: null },
    });

    await prisma.inventory.create({
      data: { storeId, productId, quantity: 10 },
    });

    const offer = await prisma.offer.create({
      data: {
        companyId,
        storeId,
        title: `Oferta ${suffix}`,
        discountType: 'PERCENTAGE',
        discountValue: 10,
        status: 'ACTIVE',
        products: { create: [{ productId }] },
      },
    });
    expect(offer.id).toBeDefined();

    const eventRows = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO events (id, type, target_type, target_id, created_at)
      SELECT gen_random_uuid(), 'PRODUCT_VIEW', 'product', ${productId}::uuid, NOW()
      FROM generate_series(1, 5)
      RETURNING id
    `;
    expect(eventRows).toHaveLength(5);
  });

  afterAll(async () => {
    await prisma.company.delete({ where: { id: companyId } }).catch(() => undefined);
    await prisma.tag.delete({ where: { id: tagId } }).catch(() => undefined);
    await app.close();
  });

  describe('GET /api/discovery', () => {
    it('returns the product in the feed with reasons', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/discovery?companyId=${companyId}`)
        .expect(200);

      const hit = res.body.hits.find((h: { id: string }) => h.id === productId);
      expect(hit).toBeDefined();
      expect(hit.type).toBe('product');
      expect(Array.isArray(hit.reasons)).toBe(true);
      expect(hit.reasons).toContain('disponível agora');
      expect(hit.tagNames).toContain(`Tag ${suffix}`);
      expect(typeof hit.score).toBe('number');
    });

    it('exposes the signals interface on ranked feed hits (discovery core unchanged)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/discovery?companyId=${companyId}`)
        .expect(200);

      const hit = res.body.hits.find((h: { id: string }) => h.id === productId);
      expect(hit).toBeDefined();
      expect(hit.signals).toBeDefined();

      expect(typeof hit.signals.textRelevance).toBe('number');
      expect(typeof hit.signals.availability).toBe('number');
      expect(typeof hit.signals.proximity).toBe('number');
      expect(typeof hit.signals.price).toBe('number');
      expect(typeof hit.signals.popularity).toBe('number');
      expect(typeof hit.signals.rating).toBe('number');
      expect(typeof hit.signals.recency).toBe('number');

      expect(hit.signals.availability).toBeGreaterThanOrEqual(0.3);
      expect(hit.signals.availability).toBeLessThanOrEqual(1);
    });

    it('deduplicates products and stores', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/discovery?companyId=${companyId}`)
        .expect(200);

      const keys = res.body.hits.map((h: { type: string; id: string }) => `${h.type}:${h.id}`);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('filters by tag slug', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/discovery?companyId=${companyId}&tagSlug=${tagSlug}`)
        .expect(200);

      expect(res.body.hits.some((h: { id: string }) => h.id === productId)).toBe(true);
    });

    it('paginates results', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/discovery?companyId=${companyId}&page=1&limit=1`)
        .expect(200);

      expect(res.body.limit).toBe(1);
      expect(res.body.page).toBe(1);
    });
  });

  describe('GET /api/discovery/offers', () => {
    it('returns products with an active offer and the offer reason', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/discovery/offers?companyId=${companyId}`)
        .expect(200);

      const hit = res.body.hits.find((h: { id: string }) => h.id === productId);
      expect(hit).toBeDefined();
      expect(hit.reasons).toContain('em oferta');
    });
  });

  describe('GET /api/discovery/new', () => {
    it('returns recently created products and stores', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/discovery/new?companyId=${companyId}`)
        .expect(200);

      expect(res.body.hits.some((h: { id: string }) => h.id === productId)).toBe(true);
      const hit = res.body.hits.find((h: { id: string }) => h.id === productId);
      expect(hit.reasons).toContain('novidade');
    });
  });

  describe('GET /api/discovery/trending', () => {
    it('returns products with recent view events', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/discovery/trending?companyId=${companyId}`)
        .expect(200);

      const hit = res.body.hits.find((h: { id: string }) => h.id === productId);
      expect(hit).toBeDefined();
      expect(hit.score).toBeGreaterThan(0);
    });
  });

  describe('GET /api/discovery/nearby', () => {
    it('returns stores near the given coordinates', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/discovery/nearby?lat=-12.3456&lng=-55.6789&radius=5000')
        .expect(200);

      const hit = res.body.hits.find((h: { id: string }) => h.id === storeId);
      expect(hit).toBeDefined();
      expect(hit.type).toBe('store');
      expect(hit.distance).toBeLessThan(5000);
      expect(hit.reasons).toContain('perto de você');
      expect(hit.reasons).toContain('disponível agora');
    });

    it('returns empty without coordinates', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/discovery/nearby')
        .expect(200);

      expect(res.body.hits).toEqual([]);
    });

    it('rejects a radius above the maximum', async () => {
      await request(app.getHttpServer())
        .get('/api/discovery/nearby?lat=-3.7&lng=-38.5&radius=100000')
        .expect(400);
    });
  });

  describe('tags on products', () => {
    it('lists product tags via the API', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/tags?group=attribute`)
        .expect(200);

      expect(res.body.some((t: { id: string }) => t.id === tagId)).toBe(true);
    });
  });
});
