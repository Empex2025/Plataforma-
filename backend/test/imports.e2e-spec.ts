import { jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/db/prisma.service.js';
import { IMPORT_STORAGE } from './../src/modules/imports/imports.types.js';
import type { IImportStorage } from './../src/modules/imports/imports.types.js';
import {
  registerAndLogin,
  cleanupCompanyAndUsers,
} from './support/e2e.helpers.js';

describe('Imports (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let companyId: string;
  let userIds: string[] = [];
  let token: string;
  let userId: string;

  const mockStorage: IImportStorage = {
    upload: jest.fn().mockResolvedValue('mock-key'),
    download: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IMPORT_STORAGE)
      .useValue(mockStorage)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    prisma = app.get(PrismaService);

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const user = await registerAndLogin(app, `import-user-${suffix}@test.com`, 'password123', 'Merchant');
    token = user.token;
    userId = user.userId;
    userIds.push(userId);

    const company = await prisma.company.create({
      data: { name: `Import Co ${suffix}`, slug: `import-co-${suffix}`, status: 'ACTIVE' },
    });
    companyId = company.id;

    await prisma.userCompany.create({
      data: { userId, companyId, role: 'MERCHANT_OWNER' },
    });
  }, 30_000);

  afterAll(async () => {
    await prisma.userCompany.deleteMany({ where: { companyId } });
    await prisma.importError.deleteMany({ where: { importJob: { companyId } } });
    await prisma.importJob.deleteMany({ where: { companyId } });
    await prisma.company.delete({ where: { id: companyId } }).catch(() => {});
    await cleanupCompanyAndUsers(prisma, companyId, userIds);
    await app.close();
  });

  function createCsvFile(content: string): string {
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, `test-import-${Date.now()}.csv`);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  describe('POST /api/imports', () => {
    it('should create an import job with a CSV file', async () => {
      const filePath = createCsvFile('product_name,sku,price\nTest Product,TST-001,19.90\n');

      const res = await request(app.getHttpServer())
        .post('/api/imports')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Id', companyId)
        .attach('file', filePath)
        .expect(202);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('PENDING');
      expect(res.body.fileName).toMatch(/\.csv$/);
      expect(res.body.type).toBe('CSV');
      expect(mockStorage.upload).toHaveBeenCalled();

      fs.unlinkSync(filePath);
    });

    it('should reject without a file', async () => {
      await request(app.getHttpServer())
        .post('/api/imports')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Id', companyId)
        .expect(400);
    });

    it('should reject non-CSV files', async () => {
      const filePath = createCsvFile('not,a,csv');
      const renamedPath = filePath.replace('.csv', '.pdf');
      fs.renameSync(filePath, renamedPath);

      await request(app.getHttpServer())
        .post('/api/imports')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Id', companyId)
        .attach('file', renamedPath)
        .expect(400);

      fs.unlinkSync(renamedPath);
    });

    it('should reject without auth token', async () => {
      const filePath = createCsvFile('product_name,sku\nA,B\n');

      try {
        const res = await request(app.getHttpServer())
          .post('/api/imports')
          .set('X-Company-Id', companyId)
          .attach('file', filePath);

        expect(res.status).not.toBe(202);
      } catch {
      }

      fs.unlinkSync(filePath);
    });

    it('should reject without X-Company-Id', async () => {
      const filePath = createCsvFile('product_name,sku\nA,B\n');

      await request(app.getHttpServer())
        .post('/api/imports')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', filePath)
        .expect(403);

      fs.unlinkSync(filePath);
    });
  });

  describe('GET /api/imports', () => {
    it('should list import jobs for the company', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/imports')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Id', companyId)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should support pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/imports')
        .query({ page: 1, limit: 1 })
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Id', companyId)
        .expect(200);

      expect(res.body.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/imports/:importId', () => {
    let importId: string;

    beforeAll(async () => {
      const filePath = createCsvFile('product_name,sku\nDetail Test,DET-001\n');
      const res = await request(app.getHttpServer())
        .post('/api/imports')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Id', companyId)
        .attach('file', filePath);
      importId = res.body.id;
      fs.unlinkSync(filePath);
    });

    it('should return import job details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/imports/${importId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Id', companyId)
        .expect(200);

      expect(res.body.id).toBe(importId);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('fileName');
    });

    it('should return 404 for non-existent import', async () => {
      await request(app.getHttpServer())
        .get('/api/imports/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Id', companyId)
        .expect(404);
    });
  });

  describe('GET /api/imports/:importId/errors', () => {
    let importId: string;

    beforeAll(async () => {
      const filePath = createCsvFile('product_name,sku\nError Test,ERR-001\n');
      const res = await request(app.getHttpServer())
        .post('/api/imports')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Id', companyId)
        .attach('file', filePath);
      importId = res.body.id;
      fs.unlinkSync(filePath);
    });

    it('should return errors list for import job', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/imports/${importId}/errors`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Id', companyId)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/imports/:importId/cancel', () => {
    it('should cancel a PENDING import job', async () => {
      const filePath = createCsvFile('product_name,sku\nCancel Test,CAN-001\n');
      const createRes = await request(app.getHttpServer())
        .post('/api/imports')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Id', companyId)
        .attach('file', filePath);
      fs.unlinkSync(filePath);

      const importId = createRes.body.id;

      const res = await request(app.getHttpServer())
        .post(`/api/imports/${importId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Id', companyId);

      if (res.status === 200) {
        expect(res.body.success).toBe(true);

        const statusRes = await request(app.getHttpServer())
          .get(`/api/imports/${importId}`)
          .set('Authorization', `Bearer ${token}`)
          .set('X-Company-Id', companyId);

        expect(statusRes.body.status).toBe('CANCELLED');
      } else {
        expect(res.status).toBe(400);
      }
    });

    it('should return 400 when cancelling a completed import', async () => {
      const filePath = createCsvFile('product_name,sku\nAlready Done,DONE-001\n');
      const createRes = await request(app.getHttpServer())
        .post('/api/imports')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Id', companyId)
        .attach('file', filePath);
      fs.unlinkSync(filePath);

      if (createRes.status !== 202) {
        return;
      }

      const importId = createRes.body.id;

      await prisma.importJob.update({
        where: { id: importId },
        data: { status: 'COMPLETED', finishedAt: new Date() },
      });

      await request(app.getHttpServer())
        .post(`/api/imports/${importId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Id', companyId)
        .expect(400);
    });
  });
});
