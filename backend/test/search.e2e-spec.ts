import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/db/prisma.service.js';

describe('Search (e2e)', () => {
  let app: INestApplication<App>;
  let authToken: string;
  let adminToken: string;
  const testEmail = `e2e-search-${Date.now()}@example.com`;
  const adminEmail = `e2e-search-admin-${Date.now()}@example.com`;
  const testPassword = 'E2eT3stPass!';

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

    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: testEmail,
        name: 'Search Test User',
        password: testPassword,
      });

    if (registerRes.status === 201) {
      authToken = registerRes.body.token;
    }

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    if (loginRes.status === 200) {
      authToken = loginRes.body.token;
    }

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: adminEmail, name: 'Search Admin', password: testPassword });

    const prisma = app.get(PrismaService);
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: 'ADMIN' },
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password: testPassword });

    if (adminLogin.status === 200) {
      adminToken = adminLogin.body.token;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/search/products', () => {
    it('should return empty results when no data indexed', () => {
      return request(app.getHttpServer())
        .get('/api/search/products?q=test')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('hits');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
          expect(res.body).toHaveProperty('totalPages');
          expect(Array.isArray(res.body.hits)).toBe(true);
        });
    });

    it('should accept valid filters', () => {
      return request(app.getHttpServer())
        .get('/api/search/products?q=test&inStock=true&page=1&limit=10')
        .expect(200);
    });

    it('should reject invalid sort parameter', () => {
      return request(app.getHttpServer())
        .get('/api/search/products?q=test&sort=invalid')
        .expect(400);
    });

    it('should reject limit above maximum', () => {
      return request(app.getHttpServer())
        .get('/api/search/products?q=test&limit=100')
        .expect(400);
    });

    it('should reject negative page', () => {
      return request(app.getHttpServer())
        .get('/api/search/products?q=test&page=0')
        .expect(400);
    });

    it('should accept geo parameters', () => {
      return request(app.getHttpServer())
        .get('/api/search/products?q=test&lat=-3.7&lng=-38.5&radius=5000')
        .expect(200);
    });

    it('should reject radius above maximum', () => {
      return request(app.getHttpServer())
        .get('/api/search/products?q=test&lat=-3.7&lng=-38.5&radius=100000')
        .expect(400);
    });

    it('should reject latitude out of range', () => {
      return request(app.getHttpServer())
        .get('/api/search/products?q=test&lat=100&lng=-38.5')
        .expect(400);
    });
  });

  describe('GET /api/search/stores', () => {
    it('should return empty results when no data indexed', () => {
      return request(app.getHttpServer())
        .get('/api/search/stores?q=test')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('hits');
          expect(res.body).toHaveProperty('total');
          expect(Array.isArray(res.body.hits)).toBe(true);
        });
    });

    it('should accept valid filters', () => {
      return request(app.getHttpServer())
        .get('/api/search/stores?q=test&city=Fortaleza&state=CE')
        .expect(200);
    });

    it('should accept geo parameters with sort', () => {
      return request(app.getHttpServer())
        .get('/api/search/stores?q=test&lat=-3.7&lng=-38.5&radius=5000&sort=distance')
        .expect(200);
    });
  });

  describe('GET /api/search/autocomplete', () => {
    it('should return empty results when no data indexed', () => {
      return request(app.getHttpServer())
        .get('/api/search/autocomplete?q=arr')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should accept type filter', () => {
      return request(app.getHttpServer())
        .get('/api/search/autocomplete?q=arr&type=product')
        .expect(200);
    });

    it('should reject invalid type', () => {
      return request(app.getHttpServer())
        .get('/api/search/autocomplete?q=arr&type=invalid')
        .expect(400);
    });

    it('should accept limit parameter', () => {
      return request(app.getHttpServer())
        .get('/api/search/autocomplete?q=arr&limit=3')
        .expect(200);
    });
  });

  describe('POST /api/search/admin/reindex', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/search/admin/reindex?type=products')
        .expect(401);
    });

    it('should reject non-admin users', () => {
      return request(app.getHttpServer())
        .post('/api/search/admin/reindex?type=products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('should reject invalid type parameter for admin', () => {
      return request(app.getHttpServer())
        .post('/api/search/admin/reindex?type=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});
