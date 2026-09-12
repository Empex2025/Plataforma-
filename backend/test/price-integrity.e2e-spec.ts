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

describe('Price integrity (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = 'E2eT3stPass!';
  const email = `e2e-price-${suffix}@example.com`;

  let userId: string;
  let userToken: string;
  let companyId: string;
  let storeId: string;
  let productId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    ({ companyId, storeId, productId } = await seedCompanyStoreProduct(prisma, `${suffix}`));

    const user = await registerAndLogin(app, email, password);
    userId = user.userId;
    userToken = user.token;
    await addCompanyMember(prisma, userId, companyId, 'MERCHANT_OWNER');
  });

  afterAll(async () => {
    await cleanupCompanyAndUsers(prisma, companyId, [userId]);
    await app.close();
  });

  it('rejects two active prices for the same store/product/type at the database level', async () => {
    await prisma.price.create({
      data: { storeId, productId, type: 'REGULAR', value: 10, validTo: null },
    });

    await expect(
      prisma.price.create({
        data: { storeId, productId, type: 'REGULAR', value: 20, validTo: null },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('allows a second active price for a different type', async () => {
    await expect(
      prisma.price.create({
        data: { storeId, productId, type: 'PROMOTIONAL', value: 15, validTo: null },
      }),
    ).resolves.toBeDefined();
  });

  it('keeps exactly one active price per key when created through the API', async () => {
    await prisma.price.updateMany({
      where: { storeId, productId, type: 'REGULAR', validTo: null },
      data: { validTo: new Date() },
    });

    const first = await request(app.getHttpServer())
      .post('/api/prices')
      .set('Authorization', `Bearer ${userToken}`)
      .set('X-Company-Id', companyId)
      .send({ storeId, productId, type: 'REGULAR', value: 30 })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/api/prices')
      .set('Authorization', `Bearer ${userToken}`)
      .set('X-Company-Id', companyId)
      .send({ storeId, productId, type: 'REGULAR', value: 35 })
      .expect(201);

    const active = await prisma.price.findMany({
      where: { storeId, productId, type: 'REGULAR', validTo: null },
    });
    expect(active).toHaveLength(1);
    expect(Number(active[0].value)).toBe(35);

    const previous = await prisma.price.findUnique({ where: { id: first.body.id } });
    expect(previous?.validTo).not.toBeNull();
    expect(second.body.id).toBe(active[0].id);
  });
});
