import { jest } from '@jest/globals';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { PrismaService } from './../src/db/prisma.service.js';
import {
  cleanupCompanyAndUsers,
  createTestApp,
  registerAndLogin,
  seedCompanyStoreProduct,
} from './support/e2e.helpers.js';

jest.setTimeout(30000);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Events (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = 'E2eT3stPass!';
  const email = `e2e-events-${suffix}@example.com`;
  const searchToken = `searchtoken${suffix}`;

  let userId: string;
  let token: string;
  let companyId: string;
  let companySlug: string;
  let storeId: string;
  let storeSlug: string;
  let productId: string;
  let productSlug: string;

  async function waitForEvent(
    where: Record<string, unknown>,
    predicate: (event: Record<string, unknown>) => boolean = () => true,
  ): Promise<Record<string, unknown> | null> {
    const deadline = Date.now() + 10000;
    for (;;) {
      const events = await prisma.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      const match = events.find((e) => predicate(e as unknown as Record<string, unknown>));
      if (match) return match as unknown as Record<string, unknown>;
      if (Date.now() > deadline) return null;
      await sleep(200);
    }
  }

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    const user = await registerAndLogin(app, email, password);
    userId = user.userId;
    token = user.token;

    ({ companyId, storeId, productId } = await seedCompanyStoreProduct(prisma, `${suffix}`));
    companySlug = `e2e-co-${suffix}`;
    storeSlug = `e2e-store-${suffix}`;
    productSlug = `e2e-product-${suffix}`;

    await prisma.price.create({
      data: { storeId, productId, type: 'REGULAR', value: 10, validTo: null },
    });
    await prisma.inventory.create({
      data: { storeId, productId, quantity: 5 },
    });
  });

  afterAll(async () => {
    await cleanupCompanyAndUsers(prisma, companyId, [userId]);
    await app.close();
  });

  describe('PRODUCT_VIEW', () => {
    it('records an anonymous product view', async () => {
      const since = new Date();

      await request(app.getHttpServer())
        .get(`/api/public/products/${companySlug}/${productSlug}`)
        .expect(200);

      const event = await waitForEvent({
        type: 'PRODUCT_VIEW',
        targetId: productId,
        createdAt: { gte: since },
      });

      expect(event).not.toBeNull();
      expect(event?.userId).toBeNull();
    });

    it('attributes a product view to the authenticated user', async () => {
      const since = new Date();

      await request(app.getHttpServer())
        .get(`/api/public/products/${companySlug}/${productSlug}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const event = await waitForEvent({
        type: 'PRODUCT_VIEW',
        targetId: productId,
        createdAt: { gte: since },
      });

      expect(event).not.toBeNull();
      expect(event?.userId).toBe(userId);
    });
  });

  describe('STORE_VIEW', () => {
    it('records an anonymous store view', async () => {
      const since = new Date();

      await request(app.getHttpServer())
        .get(`/api/public/stores/${companySlug}/${storeSlug}`)
        .expect(200);

      const event = await waitForEvent({
        type: 'STORE_VIEW',
        targetId: storeId,
        createdAt: { gte: since },
      });

      expect(event).not.toBeNull();
      expect(event?.userId).toBeNull();
    });

    it('attributes a store view to the authenticated user', async () => {
      const since = new Date();

      await request(app.getHttpServer())
        .get(`/api/public/stores/${companySlug}/${storeSlug}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const event = await waitForEvent({
        type: 'STORE_VIEW',
        targetId: storeId,
        createdAt: { gte: since },
      });

      expect(event).not.toBeNull();
      expect(event?.userId).toBe(userId);
    });
  });

  describe('SEARCH', () => {
    it('records an anonymous product search with its query metadata', async () => {
      const since = new Date();

      await request(app.getHttpServer())
        .get(`/api/search/products?q=${searchToken}`)
        .expect(200);

      const event = await waitForEvent(
        { type: 'SEARCH', createdAt: { gte: since } },
        (e) => {
          const metadata = e.metadata as Record<string, unknown> | null;
          return metadata?.query === searchToken && metadata?.scope === 'product';
        },
      );

      expect(event).not.toBeNull();
      expect(event?.userId).toBeNull();
    });

    it('attributes a store search to the authenticated user', async () => {
      const since = new Date();

      await request(app.getHttpServer())
        .get(`/api/search/stores?q=${searchToken}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const event = await waitForEvent(
        { type: 'SEARCH', createdAt: { gte: since } },
        (e) => {
          const metadata = e.metadata as Record<string, unknown> | null;
          return metadata?.query === searchToken && metadata?.scope === 'store';
        },
      );

      expect(event).not.toBeNull();
      expect(event?.userId).toBe(userId);
    });
  });
});
