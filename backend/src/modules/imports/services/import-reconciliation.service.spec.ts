import { jest } from '@jest/globals';
import { ServiceUnavailableException } from '@nestjs/common';
import { ImportReconciliationService } from './import-reconciliation.service.js';
import { PrismaService } from '@/db/prisma.service.js';
import type { IImportStorage } from '../imports.types.js';

describe('ImportReconciliationService', () => {
  let service: ImportReconciliationService;
  let prisma: { importJob: { findMany: jest.Mock } };
  let storage: { list: jest.Mock; upload: jest.Mock; download: jest.Mock; delete: jest.Mock };

  beforeEach(() => {
    prisma = { importJob: { findMany: jest.fn().mockResolvedValue([]) } };
    storage = {
      list: jest.fn().mockResolvedValue([]),
      upload: jest.fn(),
      download: jest.fn(),
      delete: jest.fn(),
    };

    service = new ImportReconciliationService(
      prisma as unknown as PrismaService,
      storage as unknown as IImportStorage,
    );
  });

  it('should report no inconsistencies when jobs and objects match', async () => {
    prisma.importJob.findMany.mockResolvedValue([
      {
        id: 'job-1',
        companyId: 'company-1',
        fileKey: 'imports/company-1/a.csv',
        status: 'COMPLETED',
        createdAt: new Date(),
      },
    ]);
    storage.list.mockResolvedValue([{ key: 'imports/company-1/a.csv' }]);

    const report = await service.reconcile();

    expect(report.jobsScanned).toBe(1);
    expect(report.objectsScanned).toBe(1);
    expect(report.jobsMissingObject.count).toBe(0);
    expect(report.objectsMissingJob.count).toBe(0);
  });

  it('should detect a job whose object is missing', async () => {
    prisma.importJob.findMany.mockResolvedValue([
      {
        id: 'job-1',
        companyId: 'company-1',
        fileKey: 'imports/company-1/missing.csv',
        status: 'FAILED',
        createdAt: new Date(),
      },
    ]);
    storage.list.mockResolvedValue([]);

    const report = await service.reconcile();

    expect(report.jobsMissingObject.count).toBe(1);
    expect(report.jobsMissingObject.sample[0].id).toBe('job-1');
    expect(report.objectsMissingJob.count).toBe(0);
  });

  it('should detect an object without a job', async () => {
    prisma.importJob.findMany.mockResolvedValue([]);
    storage.list.mockResolvedValue([
      { key: 'imports/company-1/orphan.csv', size: 10, lastModified: new Date() },
    ]);

    const report = await service.reconcile();

    expect(report.objectsMissingJob.count).toBe(1);
    expect(report.objectsMissingJob.sample[0].key).toBe('imports/company-1/orphan.csv');
    expect(report.jobsMissingObject.count).toBe(0);
  });

  it('should respect the sample limit while reporting the full count', async () => {
    prisma.importJob.findMany.mockResolvedValue([]);
    storage.list.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({ key: `imports/orphan-${i}.csv` })),
    );

    const report = await service.reconcile({ sampleLimit: 2 });

    expect(report.objectsMissingJob.count).toBe(5);
    expect(report.objectsMissingJob.sample).toHaveLength(2);
  });

  it('should never delete objects (read-only diagnostic)', async () => {
    storage.list.mockResolvedValue([{ key: 'imports/orphan.csv' }]);

    await service.reconcile();

    expect(storage.delete).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('should surface storage failures as service unavailable', async () => {
    storage.list.mockRejectedValue(new Error('s3 down'));

    await expect(service.reconcile()).rejects.toThrow(ServiceUnavailableException);
  });
});
