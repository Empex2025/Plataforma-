import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('Auth + Users (e2e)', () => {
  let app: INestApplication<App>;
  let authToken: string;
  const testEmail = `e2e-test-${Date.now()}@example.com`;
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: testEmail,
          name: 'E2E Test User',
          password: testPassword,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.user.email).toBe(testEmail);
          expect(res.body.user.name).toBe('E2E Test User');
          expect(res.body.user.role).toBe('CONSUMER');
          expect(res.body.user.passwordHash).toBeUndefined();
          expect(res.body.token).toBeDefined();
          authToken = res.body.token;
        });
    });

    it('should reject duplicate email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: testEmail,
          name: 'Duplicate',
          password: testPassword,
        })
        .expect(409);
    });

    it('should reject invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          name: 'Test',
          password: testPassword,
        })
        .expect(400);
    });

    it('should reject short password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: `short-${Date.now()}@example.com`,
          name: 'Test',
          password: '123',
        })
        .expect(400);
    });

    it('should reject unknown properties', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: `extra-${Date.now()}@example.com`,
          name: 'Test',
          password: testPassword,
          role: 'ADMIN',
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.user.email).toBe(testEmail);
          expect(res.body.user.passwordHash).toBeUndefined();
          expect(res.body.token).toBeDefined();
          authToken = res.body.token;
        });
    });

    it('should reject invalid password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword!',
        })
        .expect(401);
    });

    it('should reject non-existent email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword,
        })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe(testEmail);
          expect(res.body.passwordHash).toBeUndefined();
        });
    });

    it('should reject request without token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });

    it('should reject request with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('GET /api/users/me', () => {
    it('should return current user profile', () => {
      return request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe(testEmail);
          expect(res.body.passwordHash).toBeUndefined();
        });
    });

    it('should reject without token', () => {
      return request(app.getHttpServer())
        .get('/api/users/me')
        .expect(401);
    });
  });

  describe('PATCH /api/users/me', () => {
    it('should update user profile', () => {
      return request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Name');
          expect(res.body.email).toBe(testEmail);
        });
    });

    it('should reject unknown properties', () => {
      return request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ role: 'SUPER_ADMIN' })
        .expect(400);
    });
  });

  describe('POST /api/users/me/deactivate', () => {
    it('should deactivate account', () => {
      return request(app.getHttpServer())
        .post('/api/users/me/deactivate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('should prevent login after deactivation', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(410);
    });
  });
});
