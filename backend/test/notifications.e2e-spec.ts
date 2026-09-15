import { jest } from '@jest/globals';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from './../src/db/prisma.service.js';
import {
  addCompanyMember,
  assignPlanToCompany,
  cleanupCompanyAndUsers,
  createTestApp,
  registerAndLogin,
  seedCompanyStoreProduct,
} from './support/e2e.helpers.js';

jest.setTimeout(30000);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = 'E2eT3stPass!';
  const email = `e2e-notif-${suffix}@example.com`;

  let userId: string;
  let token: string;
  let companyId: string;
  let storeId: string;
  let productId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    const user = await registerAndLogin(app, email, password);
    userId = user.userId;
    token = user.token;

    ({ companyId, storeId, productId } = await seedCompanyStoreProduct(prisma, `${suffix}`));
    await assignPlanToCompany(prisma, companyId, 'PRO');
    await addCompanyMember(prisma, userId, companyId, 'MERCHANT_OWNER');
  });

  afterAll(async () => {
    await cleanupCompanyAndUsers(prisma, companyId, [userId]);
    await app.close();
  });

  describe('Authentication', () => {
    it('GET /notifications sem auth → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/notifications')
        .expect(401);
    });
  });

  describe('Empty state', () => {
    it('GET /notifications → 200 with empty list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.items).toBeDefined();
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.total).toBeDefined();
    });

    it('GET /notifications/unread → 200 with count 0', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/notifications/unread')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.count).toBe(0);
      expect(res.body.items).toHaveLength(0);
    });
  });

  describe('User scope', () => {
    let otherToken: string;
    let otherUserId: string;
    let otherCompanyId: string;

    beforeAll(async () => {
      const other = await registerAndLogin(app, `e2e-notif-other-${suffix}@example.com`, password);
      otherToken = other.token;
      otherUserId = other.userId;
      const otherEntities = await seedCompanyStoreProduct(prisma, `notif-other-${suffix}`);
      otherCompanyId = otherEntities.companyId;
      await assignPlanToCompany(prisma, otherCompanyId, 'PRO');
      await addCompanyMember(prisma, otherUserId, otherCompanyId, 'MERCHANT_OWNER');
    });

    afterAll(async () => {
      await cleanupCompanyAndUsers(prisma, otherCompanyId, [otherUserId]);
    });

    it('usuário A não acessa notifications do usuário B', async () => {
      const resA = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const resB = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      const idsA = resA.body.items.map((n: { id: string }) => n.id);
      const idsB = resB.body.items.map((n: { id: string }) => n.id);

      const overlap = idsA.filter((id: string) => idsB.includes(id));
      expect(overlap).toHaveLength(0);
    });
  });

  describe('Price drop notification via alert flow', () => {
    it('creates a PRICE_BELOW alert', async () => {
      await request(app.getHttpServer())
        .post('/api/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({ targetType: 'product', targetId: productId, trigger: 'PRICE_BELOW', threshold: '50.00' })
        .expect(201);
    });

    it('triggers notification when price drops below threshold', async () => {
      await request(app.getHttpServer())
        .post('/api/prices')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Id', companyId)
        .send({ storeId, productId, type: 'REGULAR', value: 25 })
        .expect(201);

      await sleep(3000);

      const res = await request(app.getHttpServer())
        .get('/api/notifications/unread')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const priceDropNotif = res.body.items.find(
        (n: { type: string }) => n.type === 'PRICE_DROP',
      );
      expect(priceDropNotif).toBeDefined();
      expect(priceDropNotif.title).toBe('Preço caiu');
      expect(priceDropNotif.targetType).toBe('product');
      expect(priceDropNotif.targetId).toBe(productId);
    });

    it('GET /notifications → 200 with notifications', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.items.length).toBeGreaterThan(0);
    });
  });

  describe('Back in stock notification', () => {
    it('creates a BACK_IN_STOCK alert', async () => {
      await request(app.getHttpServer())
        .post('/api/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({ targetType: 'product', targetId: productId, trigger: 'BACK_IN_STOCK' })
        .expect(201);
    });

    it('triggers notification when product is back in stock', async () => {
      await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Id', companyId)
        .send({ storeId, productId, quantity: 0 })
        .expect(201);

      await sleep(1000);

      await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Id', companyId)
        .send({ storeId, productId, quantity: 10 })
        .expect(201);

      await sleep(3000);

      const res = await request(app.getHttpServer())
        .get('/api/notifications/unread')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const stockNotif = res.body.items.find(
        (n: { type: string }) => n.type === 'BACK_IN_STOCK',
      );
      expect(stockNotif).toBeDefined();
      expect(stockNotif.title).toBe('Produto voltou ao estoque');
    });
  });

  describe('Mark as read', () => {
    let notificationId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get('/api/notifications/unread')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      if (res.body.items.length > 0) {
        notificationId = res.body.items[0].id;
      }
    });

    it('POST /notifications/:id/read → 200', async () => {
      if (!notificationId) return;

      await request(app.getHttpServer())
        .post(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/notifications/unread')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const readNotif = res.body.items.find(
        (n: { id: string }) => n.id === notificationId,
      );
      expect(readNotif).toBeUndefined();
    });

    it('POST /notifications/read-all → 200', async () => {
      await request(app.getHttpServer())
        .post('/api/notifications/read-all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/notifications/unread')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.count).toBe(0);
      expect(res.body.items).toHaveLength(0);
    });
  });

  describe('Pagination', () => {
    it('respects limit parameter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/notifications?limit=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.limit).toBe(1);
      expect(res.body.items.length).toBeLessThanOrEqual(1);
    });

    it('enforces max limit of 50', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/notifications?limit=100')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.limit).toBe(50);
    });

    it('returns correct page', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/notifications?page=1&limit=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.page).toBe(1);
    });
  });

  describe('Notification ordering', () => {
    it('notifications ordered by createdAt DESC', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      if (res.body.items.length >= 2) {
        const dates = res.body.items.map((n: { createdAt: string }) => new Date(n.createdAt).getTime());
        for (let i = 1; i < dates.length; i++) {
          expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
        }
      }
    });
  });

  describe('Duplicate event → only one notification', () => {
    it('does not create duplicate notification for same event within 24h', async () => {
      const beforeRes = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const _beforeCount = beforeRes.body.total;

      await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Id', companyId)
        .send({ storeId, productId, quantity: 0 })
        .expect(201);

      await sleep(1000);

      await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Id', companyId)
        .send({ storeId, productId, quantity: 5 })
        .expect(201);

      await sleep(3000);

      const afterRes = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const backInStockNotifs = afterRes.body.items.filter(
        (n: { type: string; targetId: string }) =>
          n.type === 'BACK_IN_STOCK' && n.targetId === productId,
      );

      expect(backInStockNotifs.length).toBeLessThanOrEqual(1);
    });
  });
});

