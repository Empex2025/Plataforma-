import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { PrismaService } from './../src/db/prisma.service.js';
import { EmbeddingService } from './../src/modules/ai/services/embedding.service.js';
import {
  createTestApp,
  seedCompanyStoreProduct,
  cleanupCompanyAndUsers,
} from './support/e2e.helpers.js';

/**
 * Exercises the hybrid (semantic) path with the offline deterministic provider.
 * The real HTTP provider is covered by unit tests + the fallback E2E spec.
 */
describe('AI Recommendations (e2e) — AI enabled (local provider)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let embeddingService: EmbeddingService;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let companyId: string;
  let productId: string;

  const aiEnv: Record<string, string> = {
    AI_ENABLED: 'true',
    AI_PROVIDER: 'local',
    EMBEDDING_MODEL: 'local-deterministic',
    EMBEDDING_DIMENSION: '64',
    EMBEDDING_VECTOR_STORE: 'array',
  };

  beforeAll(async () => {
    for (const [key, value] of Object.entries(aiEnv)) process.env[key] = value;

    ({ app, prisma } = await createTestApp());
    embeddingService = app.get(EmbeddingService);

    const entities = await seedCompanyStoreProduct(prisma, `ai-${suffix}`);
    companyId = entities.companyId;
    productId = entities.productId;

    await prisma.product.update({
      where: { id: productId },
      data: { name: 'Corrida', description: 'Corrida corrida' },
    });

    const outcome = await embeddingService.embedEntity('product', productId);
    expect(outcome.status).toBe('stored');
  });

  afterAll(async () => {
    await cleanupCompanyAndUsers(prisma, companyId, []);
    await app.close();
    for (const key of Object.keys(aiEnv)) delete process.env[key];
  });

  it('keeps returning recommendations', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/recommendations/products?limit=50')
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('adds the SEMANTICALLY_RELEVANT reason for a semantically matching product', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/recommendations/products?searchQuery=corrida&limit=50')
      .expect(200);

    const hit = res.body.items.find((item: { id: string }) => item.id === productId);
    expect(hit).toBeDefined();
    expect(hit.reasons.some((r: { code: string }) => r.code === 'SEMANTICALLY_RELEVANT')).toBe(true);
  });

  it('does not expose internal scores, embeddings or user data', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/recommendations/products?searchQuery=corrida&limit=50')
      .expect(200);

    for (const item of res.body.items) {
      expect(item).not.toHaveProperty('score');
      expect(item).not.toHaveProperty('_score');
      expect(item).not.toHaveProperty('embedding');
      expect(item).not.toHaveProperty('vector');
      expect(item).not.toHaveProperty('userId');
      expect(item).not.toHaveProperty('history');
    }
  });

  it('preserves pagination fields', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/recommendations/products?limit=1&page=1')
      .expect(200);

    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(1);
    expect(typeof res.body.total).toBe('number');
    expect(typeof res.body.totalPages).toBe('number');
  });

  it('supports cold start (no query, no auth)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/recommendations/products')
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('returns semantically similar products without exposing internals', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/products/${productId}/recommendations?limit=50`)
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
    for (const item of res.body.items) {
      expect(item).not.toHaveProperty('_score');
      expect(item).not.toHaveProperty('embedding');
    }
  });
});
