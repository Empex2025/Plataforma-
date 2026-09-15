import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { AppModule } from '@/app.module.js';

describe('Recommendations (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /recommendations/products', () => {
    it('should return 200 with products', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations/products')
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('totalPages');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations/products')
        .query({ limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.limit).toBe(5);
    });

    it('should respect page parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations/products')
        .query({ page: 2, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(2);
    });

    it('should filter by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations/products')
        .query({ categoryId: '00000000-0000-0000-0000-000000000000' });

      expect(response.status).toBe(200);
      expect(response.body.items).toEqual([]);
    });
  });

  describe('GET /recommendations/stores', () => {
    it('should return 200 with stores', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations/stores')
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.items)).toBe(true);
    });
  });

  describe('GET /recommendations/offers', () => {
    it('should return 200 with offers', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations/offers')
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.items)).toBe(true);
    });
  });

  describe('GET /products/:id/recommendations', () => {
    it('should return 200 with similar products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/00000000-0000-0000-0000-000000000000/recommendations')
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
    });
  });

  describe('GET /stores/:id/recommendations', () => {
    it('should return 200 with similar stores', async () => {
      const response = await request(app.getHttpServer())
        .get('/stores/00000000-0000-0000-0000-000000000000/recommendations')
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
    });
  });

  describe('Cold start', () => {
    it('should work without user authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations/products')
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
    });

    it('should work without location', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations/products')
        .query({ limit: 10 });

      expect(response.status).toBe(200);
    });
  });

  describe('Privacy', () => {
    it('should not expose internal score', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations/products')
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      for (const item of response.body.items) {
        expect(item).not.toHaveProperty('score');
        expect(item).not.toHaveProperty('_score');
      }
    });

    it('should not expose user history', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations/products')
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      for (const item of response.body.items) {
        expect(item).not.toHaveProperty('userId');
        expect(item).not.toHaveProperty('favorites');
        expect(item).not.toHaveProperty('history');
      }
    });
  });

  describe('Limit validation', () => {
    it('should reject limit above max', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations/products')
        .query({ limit: 100 });

      expect(response.status).toBe(400);
    });
  });
});
