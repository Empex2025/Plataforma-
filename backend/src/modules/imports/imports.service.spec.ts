import { jest } from '@jest/globals';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

jest.unstable_mockModule('./storage/s3.storage.js', () => ({
  S3Storage: jest.fn().mockImplementation(() => ({
    upload: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  })),
}));

const { ImportsService } = await import('./imports.service.js');

import { MulterFile } from './imports.types.js';
import { MAX_JOBS_PER_COMPANY } from './imports.constants.js';

describe('ImportsService', () => {
  let service: InstanceType<typeof ImportsService>;
  let prisma: {
    importJob: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    importError: {
      findMany: jest.Mock;
      count: jest.Mock;
      createMany: jest.Mock;
    };
    userCompany: {
      findUnique: jest.Mock;
    };
  };
  let queue: { add: jest.Mock };

  const companyId = 'company-1';
  const userId = 'user-1';

  beforeEach(() => {
    prisma = {
      importJob: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      importError: {
        findMany: jest.fn(),
        count: jest.fn(),
        createMany: jest.fn(),
      },
      userCompany: {
        findUnique: jest.fn(),
      },
    };
    queue = { add: jest.fn() };
    service = new ImportsService(prisma as never, queue as never);
    jest.clearAllMocks();
  });

  const mockFile: MulterFile = {
    fieldname: 'file',
    originalname: 'products.csv',
    encoding: '7bit',
    mimetype: 'text/csv',
    size: 1024,
    destination: '/tmp',
    filename: 'products.csv',
    path: '/tmp/products.csv',
    buffer: Buffer.from(''),
  };

  const mockJob = {
    id: 'job-1',
    companyId,
    storeId: null,
    type: 'CSV',
    status: 'PENDING',
    fileName: 'products.csv',
    fileKey: `imports/${companyId}/123_products.csv`,
    total: 0,
    processed: 0,
    success: 0,
    errors: 0,
    createdAt: new Date(),
    startedAt: null,
    finishedAt: null,
  };

  beforeEach(() => {
    prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
  });

  describe('create', () => {
    it('should create import job', async () => {
      prisma.importJob.count.mockResolvedValue(0);
      prisma.importJob.create.mockResolvedValue(mockJob);

      const result = await service.create(companyId, userId, {}, mockFile);

      expect(result.id).toBe('job-1');
      expect(result.status).toBe('PENDING');
      expect(prisma.importJob.create).toHaveBeenCalledTimes(1);
      expect(queue.add).toHaveBeenCalledWith(
        'process-import',
        expect.objectContaining({ importJobId: 'job-1', companyId }),
        expect.any(Object),
      );
    });

    it('should validate file type', async () => {
      const invalidFile = { ...mockFile, mimetype: 'application/pdf' };

      await expect(
        service.create(companyId, userId, {}, invalidFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate rate limit', async () => {
      prisma.importJob.count.mockResolvedValue(MAX_JOBS_PER_COMPANY);

      await expect(
        service.create(companyId, userId, {}, mockFile),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('listByCompany', () => {
    it('should return import jobs for company', async () => {
      const jobs = [mockJob];
      prisma.importJob.findMany.mockResolvedValue(jobs);
      prisma.importJob.count.mockResolvedValue(1);

      const result = await service.listByCompany(companyId, userId);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.importJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId } }),
      );
    });
  });

  describe('findById', () => {
    it('should return import job', async () => {
      prisma.importJob.findUnique.mockResolvedValue(mockJob);

      const result = await service.findById(companyId, 'job-1', userId);

      expect(result.id).toBe('job-1');
    });

    it('should throw NotFoundException for non-existent job', async () => {
      prisma.importJob.findUnique.mockResolvedValue(null);

      await expect(
        service.findById(companyId, 'nonexistent', userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for wrong company', async () => {
      prisma.importJob.findUnique.mockResolvedValue({
        ...mockJob,
        companyId: 'other-company',
      });

      await expect(
        service.findById(companyId, 'job-1', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findErrors', () => {
    it('should return errors for import job', async () => {
      prisma.importJob.findUnique.mockResolvedValue(mockJob);
      prisma.importError.findMany.mockResolvedValue([
        {
          id: 'err-1',
          importJobId: 'job-1',
          line: 2,
          field: 'product_name',
          code: 'REQUIRED_FIELD',
          message: 'Product name is required',
          value: null,
          createdAt: new Date(),
        },
      ]);
      prisma.importError.count.mockResolvedValue(1);

      const result = await service.findErrors(companyId, 'job-1', userId);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('cancel', () => {
    it('should cancel import job', async () => {
      prisma.importJob.findUnique.mockResolvedValue(mockJob);
      prisma.importJob.update.mockResolvedValue({
        ...mockJob,
        status: 'CANCELLED',
      });

      await service.cancel(companyId, 'job-1', userId);

      expect(prisma.importJob.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { status: 'CANCELLED' },
      });
    });

    it('should throw BadRequestException for non-cancellable status', async () => {
      prisma.importJob.findUnique.mockResolvedValue({
        ...mockJob,
        status: 'COMPLETED',
      });

      await expect(
        service.cancel(companyId, 'job-1', userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cross-company', () => {
    it('should reject access from another company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue(null);

      await expect(
        service.findById('other-company', 'job-1', userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
