import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { PrismaService } from './../src/db/prisma.service.js';
import { ExperimentAssignmentService } from './../src/modules/experiments/services/experiment-assignment.service.js';
import { EmbeddingService } from './../src/modules/ai/services/embedding.service.js';
import {
  cleanupCompanyAndUsers,
  createTestApp,
  promoteToAdmin,
  registerAndLogin,
  seedCompanyStoreProduct,
} from './support/e2e.helpers.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Experiments (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let assignmentService: ExperimentAssignmentService;
  let embeddingService: EmbeddingService;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = 'E2eT3stPass!';
  const createdExperimentKeys: string[] = [];

  const adminEmail = `e2e-exp-admin-${suffix}@example.com`;
  const consumerEmail = `e2e-exp-consumer-${suffix}@example.com`;
  const controlEmail = `e2e-exp-control-${suffix}@example.com`;
  const treatmentEmail = `e2e-exp-treatment-${suffix}@example.com`;

  let adminToken: string;
  let consumerToken: string;
  let controlUser: { token: string; userId: string };
  let treatmentUser: { token: string; userId: string };

  let companyId: string;
  let productId: string;

  const aiEnv: Record<string, string> = {
    AI_ENABLED: 'true',
    AI_PROVIDER: 'local',
    EMBEDDING_MODEL: 'local-deterministic',
    EMBEDDING_DIMENSION: '64',
    EMBEDDING_VECTOR_STORE: 'array',
  };

  function experimentPayload(overrides: Record<string, unknown> = {}) {
    const key = `exp-${suffix}-${Math.random().toString(36).slice(2, 6)}`;
    createdExperimentKeys.push(key);
    return {
      key,
      domain: 'recommendation',
      name: 'E2E Experiment',
      variants: [
        { key: 'CONTROL', name: 'Control', allocation: 50, config: { recommendation_mode: 'deterministic' } },
        { key: 'TREATMENT', name: 'Treatment', allocation: 50, config: { recommendation_mode: 'hybrid' } },
      ],
      ...overrides,
    };
  }

  beforeAll(async () => {
    for (const [key, value] of Object.entries(aiEnv)) process.env[key] = value;

    ({ app, prisma } = await createTestApp());
    assignmentService = app.get(ExperimentAssignmentService);
    embeddingService = app.get(EmbeddingService);

    await registerAndLogin(app, adminEmail, password);
    await promoteToAdmin(prisma, adminEmail);
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password });
    adminToken = adminLogin.body.token;

    consumerToken = (await registerAndLogin(app, consumerEmail, password)).token;
    controlUser = await registerAndLogin(app, controlEmail, password);
    treatmentUser = await registerAndLogin(app, treatmentEmail, password);

    const entities = await seedCompanyStoreProduct(prisma, `exp-${suffix}`);
    companyId = entities.companyId;
    productId = entities.productId;
    await prisma.product.update({
      where: { id: productId },
      data: { name: 'Corrida', description: 'Corrida corrida' },
    });
    await embeddingService.embedEntity('product', productId);
  });

  afterAll(async () => {
    await prisma.experiment.deleteMany({ where: { key: { in: createdExperimentKeys } } }).catch(() => undefined);
    await cleanupCompanyAndUsers(prisma, companyId, [
      controlUser.userId,
      treatmentUser.userId,
    ]);
    await app.close();
    for (const key of Object.keys(aiEnv)) delete process.env[key];
  });

  describe('Admin API', () => {
    it('rejects unauthenticated access', async () => {
      await request(app.getHttpServer()).get('/api/experiments').expect(401);
    });

    it('forbids non-admin users', async () => {
      await request(app.getHttpServer())
        .post('/api/experiments')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send(experimentPayload())
        .expect(403);
    });

    it('creates an experiment (DRAFT) as admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/experiments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(experimentPayload())
        .expect(201);

      expect(res.body.status).toBe('DRAFT');
      expect(res.body.variants).toHaveLength(2);
    });

    it('rejects an invalid allocation (sum != 100)', async () => {
      await request(app.getHttpServer())
        .post('/api/experiments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          experimentPayload({
            variants: [
              { key: 'CONTROL', name: 'C', allocation: 60 },
              { key: 'TREATMENT', name: 'T', allocation: 30 },
            ],
          }),
        )
        .expect(400);
    });

    it('rejects a duplicate key', async () => {
      const payload = experimentPayload();
      await request(app.getHttpServer())
        .post('/api/experiments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/experiments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(409);
    });
  });

  describe('Assignment lifecycle', () => {
    let experimentId: string;
    let experimentKey: string;

    beforeAll(async () => {
      const payload = experimentPayload();
      experimentKey = payload.key as string;
      const res = await request(app.getHttpServer())
        .post('/api/experiments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);
      experimentId = res.body.id;
    });

    it('does not assign while DRAFT', async () => {
      const result = await assignmentService.assign(experimentKey, { type: 'user', id: 'draft-user' });
      expect(result).toBeNull();
    });

    it('starts the experiment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/experiments/${experimentId}/start`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe('RUNNING');
    });

    it('keeps the same variant for the same subject', async () => {
      const first = await assignmentService.assign(experimentKey, { type: 'user', id: 'stable-user' });
      const second = await assignmentService.assign(experimentKey, { type: 'user', id: 'stable-user' });

      expect(first).not.toBeNull();
      expect(second!.variantKey).toBe(first!.variantKey);
    });

    it('distributes subjects across both variants', async () => {
      const seen = new Set<string>();
      for (let i = 0; i < 100; i += 1) {
        const result = await assignmentService.assign(experimentKey, { type: 'user', id: `synth-${suffix}-${i}` });
        if (result) seen.add(result.variantKey);
      }
      expect(seen.has('CONTROL')).toBe(true);
      expect(seen.has('TREATMENT')).toBe(true);
    });

    it('does not move an already-assigned subject when allocation changes', async () => {
      const subject = { type: 'user' as const, id: `pinned-${suffix}` };
      const before = await assignmentService.assign(experimentKey, subject);
      expect(before).not.toBeNull();

      await request(app.getHttpServer())
        .patch(`/api/experiments/${experimentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          variants: [
            { key: 'CONTROL', name: 'Control', allocation: 0, config: { recommendation_mode: 'deterministic' } },
            { key: 'TREATMENT', name: 'Treatment', allocation: 100, config: { recommendation_mode: 'hybrid' } },
          ],
        })
        .expect(200);

      const after = await assignmentService.assign(experimentKey, subject);
      expect(after!.variantKey).toBe(before!.variantKey);
    });

    it('pauses the experiment and stops new assignments', async () => {
      await request(app.getHttpServer())
        .post(`/api/experiments/${experimentId}/pause`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const result = await assignmentService.assign(experimentKey, { type: 'user', id: `paused-${suffix}` });
      expect(result).toBeNull();
    });

    it('completes the experiment (frozen)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/experiments/${experimentId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe('COMPLETED');
    });

    it('does not assign after completion', async () => {
      const result = await assignmentService.assign(experimentKey, { type: 'user', id: `completed-${suffix}` });
      expect(result).toBeNull();
    });

    it('rejects a second RUNNING experiment in the same domain', async () => {
      // The first experiment is COMPLETED, so start a fresh one then try a second.
      const first = experimentPayload();
      const firstRes = await request(app.getHttpServer())
        .post('/api/experiments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(first)
        .expect(201);

      const second = experimentPayload();
      const secondRes = await request(app.getHttpServer())
        .post('/api/experiments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(second)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/experiments/${firstRes.body.id}/start`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/experiments/${secondRes.body.id}/start`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      await request(app.getHttpServer())
        .post(`/api/experiments/${firstRes.body.id}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Recommendation integration (CONTROL vs TREATMENT)', () => {
    it('CONTROL serves deterministic recommendations and records an impression', async () => {
      const payload = experimentPayload({
        variants: [
          { key: 'CONTROL', name: 'Control', allocation: 100, config: { recommendation_mode: 'deterministic' } },
          { key: 'TREATMENT', name: 'Treatment', allocation: 0, config: { recommendation_mode: 'hybrid' } },
        ],
      });
      const created = await request(app.getHttpServer())
        .post('/api/experiments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/experiments/${created.body.id}/start`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/recommendations/products?searchQuery=corrida&limit=50')
        .set('Authorization', `Bearer ${controlUser.token}`)
        .expect(200);

      const hit = res.body.items.find((item: { id: string }) => item.id === productId);
      expect(hit).toBeDefined();
      expect(hit.reasons.some((r: { code: string }) => r.code === 'SEMANTICALLY_RELEVANT')).toBe(false);

      await delay(400);
      const impressions = await prisma.event.count({
        where: { userId: controlUser.userId, type: 'RECOMMENDATION_IMPRESSION' },
      });
      expect(impressions).toBeGreaterThanOrEqual(1);

      await request(app.getHttpServer())
        .post(`/api/experiments/${created.body.id}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('TREATMENT serves hybrid recommendations', async () => {
      const payload = experimentPayload({
        variants: [
          { key: 'CONTROL', name: 'Control', allocation: 0, config: { recommendation_mode: 'deterministic' } },
          { key: 'TREATMENT', name: 'Treatment', allocation: 100, config: { recommendation_mode: 'hybrid' } },
        ],
      });
      const created = await request(app.getHttpServer())
        .post('/api/experiments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/experiments/${created.body.id}/start`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/recommendations/products?searchQuery=corrida&limit=50')
        .set('Authorization', `Bearer ${treatmentUser.token}`)
        .expect(200);

      const hit = res.body.items.find((item: { id: string }) => item.id === productId);
      expect(hit).toBeDefined();
      expect(hit.reasons.some((r: { code: string }) => r.code === 'SEMANTICALLY_RELEVANT')).toBe(true);

      await request(app.getHttpServer())
        .post(`/api/experiments/${created.body.id}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Results', () => {
    let resultsExperimentId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/experiments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(experimentPayload())
        .expect(201);
      resultsExperimentId = res.body.id;
    });

    it('returns aggregated results with null rates when there is no data', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/experiments/${resultsExperimentId}/results?period=30d`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.variants).toHaveLength(2);
      for (const variant of res.body.variants) {
        expect(variant.impressions).toBe(0);
        expect(variant.ctr).toBeNull();
      }
      expect(res.body.significance.computed).toBe(false);
    });

    it('never exposes user identifiers in results', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/experiments/${resultsExperimentId}/results?period=30d`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(JSON.stringify(res.body)).not.toMatch(/userId|subjectId/);
    });

    it('forbids non-admin access to results', async () => {
      await request(app.getHttpServer())
        .get(`/api/experiments/${resultsExperimentId}/results`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(403);
    });
  });
});
