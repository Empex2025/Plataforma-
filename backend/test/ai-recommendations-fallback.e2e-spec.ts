import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { PrismaService } from './../src/db/prisma.service.js';
import {
  createTestApp,
  seedCompanyStoreProduct,
  cleanupCompanyAndUsers,
} from './support/e2e.helpers.js';

describe('AI Recommendations (e2e) — provider unavailable fallback', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let companyId: string;
  let productId: string;

  const aiEnv: Record<string, string> = {
    AI_ENABLED: 'true',
    AI_PROVIDER: 'openai',
    AI_BASE_URL: 'http://127.0.0.1:1/v1',
    AI_API_KEY: 'test-key',
    EMBEDDING_MODEL: 'text-embedding-3-small',
    EMBEDDING_DIMENSION: '1536',
    EMBEDDING_VECTOR_STORE: 'array',
  };

  beforeAll(async () => {
    for (const [key, value] of Object.entries(aiEnv)) process.env[key] = value;

    ({ app, prisma } = await createTestApp());

    const entities = await seedCompanyStoreProduct(prisma, `aifb-${suffix}`);
    companyId = entities.companyId;
    productId = entities.productId;
  });

  afterAll(async () => {
    await cleanupCompanyAndUsers(prisma, companyId, []);
    await app.close();
    for (const key of Object.keys(aiEnv)) delete process.env[key];
  });

  it('returns deterministic recommendations instead of failing (no 500)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/recommendations/products?searchQuery=qualquer-coisa&limit=50')
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.some((item: { id: string }) => item.id === productId)).toBe(true);
  });

  it('still returns items without exposing internals', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/recommendations/products')
      .expect(200);

    for (const item of res.body.items) {
      expect(item).not.toHaveProperty('_score');
      expect(item).not.toHaveProperty('embedding');
    }
  });

  it('keeps the similar-products endpoint healthy', async () => {
    await request(app.getHttpServer())
      .get(`/api/products/${productId}/recommendations`)
      .expect(200);
  });
});
