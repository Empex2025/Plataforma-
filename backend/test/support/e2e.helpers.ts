import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/db/prisma.service.js';

export interface TestContext {
  app: INestApplication<App>;
  prisma: PrismaService;
}

export async function createTestApp(): Promise<TestContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.init();

  const prisma = app.get(PrismaService);
  return { app, prisma };
}

export async function registerAndLogin(
  app: INestApplication<App>,
  email: string,
  password: string,
  name = 'E2E User',
): Promise<{ token: string; userId: string }> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({ email, name, password });

  if (res.status !== 201) {
    throw new Error(`Registration failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }

  const user = await (app.get(PrismaService) as PrismaService).user.findUnique({
    where: { email },
  });

  return { token: res.body.token, userId: user!.id };
}

export interface SeededEntities {
  companyId: string;
  storeId: string;
  productId: string;
}

export async function seedCompanyStoreProduct(
  prisma: PrismaService,
  suffix: string,
): Promise<SeededEntities> {
  const company = await prisma.company.create({
    data: { name: `E2E Co ${suffix}`, slug: `e2e-co-${suffix}`, status: 'ACTIVE' },
  });

  const point = 'POINT(-38.5 -3.7)';
  const storeRows = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO stores (id, company_id, name, slug, location, status, created_at, updated_at)
    VALUES (
      gen_random_uuid(), ${company.id}::uuid, ${`E2E Store ${suffix}`}, ${`e2e-store-${suffix}`},
      ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography, 'ACTIVE', NOW(), NOW()
    )
    RETURNING id
  `;

  const product = await prisma.product.create({
    data: {
      companyId: company.id,
      name: `E2E Product ${suffix}`,
      slug: `e2e-product-${suffix}`,
      status: 'ACTIVE',
    },
  });

  return { companyId: company.id, storeId: storeRows[0].id, productId: product.id };
}

export async function addCompanyMember(
  prisma: PrismaService,
  userId: string,
  companyId: string,
  role: 'MERCHANT_OWNER' | 'MERCHANT_MANAGER',
): Promise<void> {
  await prisma.userCompany.create({ data: { userId, companyId, role } });
}

export async function promoteToAdmin(prisma: PrismaService, email: string): Promise<void> {
  await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
}

export async function cleanupCompanyAndUsers(
  prisma: PrismaService,
  companyId: string,
  userIds: string[],
): Promise<void> {
  await prisma.event.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined);
  await prisma.company.delete({ where: { id: companyId } }).catch(() => undefined);
  await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined);
}
