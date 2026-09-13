import { jest } from '@jest/globals';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
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

interface AlertState {
  id: string;
  triggeredCount: number;
  lastTriggeredAt: Date | null;
  lastObservedValue: unknown;
}

describe('Alerts flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = 'E2eT3stPass!';
  const email = `e2e-alert-flow-${suffix}@example.com`;

  let userId: string;
  let token: string;
  let companyId: string;
  let storeId: string;
  let productId: string;

  async function waitForAlert(
    alertId: string,
    predicate: (alert: AlertState) => boolean,
  ): Promise<AlertState | null> {
    const deadline = Date.now() + 12000;
    for (;;) {
      const alert = (await prisma.alert.findUnique({ where: { id: alertId } })) as AlertState | null;
      if (alert && predicate(alert)) return alert;
      if (Date.now() > deadline) return alert;
      await sleep(200);
    }
  }

  function createPrice(value: number) {
    return request(app.getHttpServer())
      .post('/api/prices')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Company-Id', companyId)
      .send({ storeId, productId, type: 'REGULAR', value });
  }

  function setStock(quantity: number) {
    return request(app.getHttpServer())
      .post('/api/inventory')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Company-Id', companyId)
      .send({ storeId, productId, quantity });
  }

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

  describe('price alert', () => {
    let alertId: string;

    it('creates a PRICE_BELOW alert', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({ targetType: 'product', targetId: productId, trigger: 'PRICE_BELOW', threshold: '20.00' })
        .expect(201);

      alertId = res.body.id;
    });

    it('does not trigger while the condition is not met', async () => {
      await createPrice(25).expect(201);

      await sleep(1500);
      const alert = (await prisma.alert.findUnique({ where: { id: alertId } })) as AlertState;
      expect(alert.triggeredCount).toBe(0);
      expect(alert.lastTriggeredAt).toBeNull();
    });

    it('triggers when the price drops below the threshold', async () => {
      await createPrice(15).expect(201);

      const alert = await waitForAlert(alertId, (a) => a.triggeredCount === 1);
      expect(alert?.triggeredCount).toBe(1);
      expect(alert?.lastTriggeredAt).not.toBeNull();
    });

    it('does not trigger again within the dedup window', async () => {
      await createPrice(10).expect(201);

      await sleep(2000);
      const alert = (await prisma.alert.findUnique({ where: { id: alertId } })) as AlertState;
      expect(alert.triggeredCount).toBe(1);
    });
  });

  describe('stock alert', () => {
    let alertId: string;

    it('creates a BACK_IN_STOCK alert', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({ targetType: 'product', targetId: productId, trigger: 'BACK_IN_STOCK' })
        .expect(201);

      alertId = res.body.id;
    });

    it('does not trigger when there is no stock', async () => {
      await setStock(0).expect(201);

      await sleep(1500);
      const alert = (await prisma.alert.findUnique({ where: { id: alertId } })) as AlertState;
      expect(alert.triggeredCount).toBe(0);
    });

    it('triggers when the product is back in stock', async () => {
      await setStock(5).expect(201);

      const alert = await waitForAlert(alertId, (a) => a.triggeredCount === 1);
      expect(alert?.triggeredCount).toBe(1);
      expect(alert?.lastTriggeredAt).not.toBeNull();
    });

    it('does not trigger again within the dedup window', async () => {
      await setStock(3).expect(201);

      await sleep(2000);
      const alert = (await prisma.alert.findUnique({ where: { id: alertId } })) as AlertState;
      expect(alert.triggeredCount).toBe(1);
    });
  });

  describe('plan enforcement', () => {
    it('rejects FREE plan company from creating alerts', async () => {
      const freeSuffix = `${Date.now()}-free-alerts-${Math.random().toString(36).slice(2, 8)}`;
      const freeUser = await registerAndLogin(app, `e2e-alert-free-${freeSuffix}@example.com`, password);
      const { companyId: freeCompanyId, productId: freeProductId } = await seedCompanyStoreProduct(prisma, `free-alerts-${freeSuffix}`);
      await addCompanyMember(prisma, freeUser.userId, freeCompanyId, 'MERCHANT_OWNER');

      const res = await request(app.getHttpServer())
        .post('/api/alerts')
        .set('Authorization', `Bearer ${freeUser.token}`)
        .send({ targetType: 'product', targetId: freeProductId, trigger: 'PRICE_BELOW', threshold: '20.00' })
        .expect(403);

      expect(res.body.message).toMatch(/alerts plan/i);

      await cleanupCompanyAndUsers(prisma, freeCompanyId, [freeUser.userId]);
    });
  });
});
