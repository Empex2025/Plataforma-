import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/db/prisma.service.js';
import { SearchIndexQueue } from './../src/modules/search/services/search-index-queue.js';
import { SEARCH_PROVIDER } from './../src/modules/search/search.constants.js';
import type { ISearchProvider } from './../src/modules/search/providers/search-provider.interface.js';

const POLL_INTERVAL_MS = 250;
const POLL_TIMEOUT_MS = 15000;

jest.setTimeout(30000);

async function waitFor<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  timeoutMs = POLL_TIMEOUT_MS,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last: T;
  do {
    last = await fn();
    if (predicate(last)) return last;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  } while (Date.now() < deadline);
  return last;
}

describe('Search (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let searchIndexQueue: SearchIndexQueue;
  let provider: ISearchProvider;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const companySlug = `e2e-search-co-${suffix}`;
  const storeSlug = `e2e-search-store-${suffix}`;
  const productSlug = `e2e-search-product-${suffix}`;
  const uniqueToken = `zetatoken${suffix}`;
  const storeToken = `omegastore${suffix}`;

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
    searchIndexQueue = app.get(SearchIndexQueue);
    provider = app.get<ISearchProvider>(SEARCH_PROVIDER);

    const company = await prisma.company.create({
      data: { name: `Search Co ${suffix}`, slug: companySlug, status: 'ACTIVE' },
    });
    companyId = company.id;

    const point = 'POINT(-38.5 -3.7)';
    const storeRows = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO stores (id, company_id, name, slug, location, status, city, state, created_at, updated_at)
      VALUES (
        gen_random_uuid(), ${companyId}::uuid, ${`Loja ${storeToken}`}, ${storeSlug},
        ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography, 'ACTIVE', 'Fortaleza', 'CE', NOW(), NOW()
      )
      RETURNING id
    `;
    storeId = storeRows[0].id;

    const product = await prisma.product.create({
      data: {
        companyId,
        name: `Produto ${uniqueToken}`,
        slug: productSlug,
        description: 'Produto para teste de busca E2E',
        status: 'ACTIVE',
      },
    });
    productId = product.id;

    await searchIndexQueue.indexProduct(productId);
    await searchIndexQueue.indexStore(storeId);
  });

  afterAll(async () => {
    await provider.deleteProduct(productId).catch(() => undefined);
    await provider.deleteStore(storeId).catch(() => undefined);
    await prisma.company.delete({ where: { id: companyId } }).catch(() => undefined);
    await app.close();
  });

  describe('GET /api/search/products', () => {
    it('returns the indexed product for a real search', async () => {
      const res = await waitFor(
        () =>
          request(app.getHttpServer())
            .get(`/api/search/products?q=${uniqueToken}`)
            .then((r) => r),
        (r) => Array.isArray(r.body?.hits) && r.body.hits.length > 0,
      );

      expect(res.status).toBe(200);
      expect(res.body.hits.some((h: { id: string }) => h.id === productId)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('returns the product with its indexed fields', async () => {
      const res = await waitFor(
        () =>
          request(app.getHttpServer())
            .get(`/api/search/products?q=${uniqueToken}`)
            .then((r) => r),
        (r) => Array.isArray(r.body?.hits) && r.body.hits.length > 0,
      );

      const hit = res.body.hits.find((h: { id: string }) => h.id === productId);
      expect(hit).toBeDefined();
      expect(hit.name).toContain(uniqueToken);
      expect(hit.companyId).toBe(companyId);
    });

    it('still accepts valid filters', async () => {
      await request(app.getHttpServer())
        .get(`/api/search/products?q=${uniqueToken}&inStock=false&page=1&limit=10`)
        .expect(200);
    });

    it('rejects limit above the maximum', async () => {
      await request(app.getHttpServer())
        .get('/api/search/products?q=test&limit=100')
        .expect(400);
    });
  });

  describe('GET /api/search/stores', () => {
    it('returns the indexed store for a real search', async () => {
      const res = await waitFor(
        () =>
          request(app.getHttpServer())
            .get(`/api/search/stores?q=${storeToken}`)
            .then((r) => r),
        (r) => Array.isArray(r.body?.hits) && r.body.hits.length > 0,
      );

      expect(res.status).toBe(200);
      const hit = res.body.hits.find((h: { id: string }) => h.id === storeId);
      expect(hit).toBeDefined();
      expect(hit._geo).toBeTruthy();
      expect(hit.city).toBe('Fortaleza');
    });

    it('accepts geo parameters with distance sort', async () => {
      await request(app.getHttpServer())
        .get(`/api/search/stores?q=${storeToken}&lat=-3.7&lng=-38.5&radius=5000&sort=distance`)
        .expect(200);
    });
  });

  describe('GET /api/search/autocomplete', () => {
    it('returns the product in autocomplete results', async () => {
      const res = await waitFor(
        () =>
          request(app.getHttpServer())
            .get(`/api/search/autocomplete?q=${uniqueToken}&type=product`)
            .then((r) => r),
        (r) => Array.isArray(r.body) && r.body.some((i: { id: string }) => i.id === productId),
      );

      expect(res.status).toBe(200);
      expect(res.body.some((i: { id: string }) => i.id === productId)).toBe(true);
    });

    it('returns the store in autocomplete results', async () => {
      const res = await waitFor(
        () =>
          request(app.getHttpServer())
            .get(`/api/search/autocomplete?q=${storeToken}&type=store`)
            .then((r) => r),
        (r) => Array.isArray(r.body) && r.body.some((i: { id: string }) => i.id === storeId),
      );

      expect(res.status).toBe(200);
      expect(res.body.some((i: { id: string }) => i.id === storeId)).toBe(true);
    });

    it('rejects an invalid type', async () => {
      await request(app.getHttpServer())
        .get('/api/search/autocomplete?q=arr&type=invalid')
        .expect(400);
    });
  });
});
