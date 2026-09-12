import { jest } from '@jest/globals';
import { Readable } from 'node:stream';
import { ImportProcessor } from './imports.processor.js';
import { CANCEL_CHECK_INTERVAL } from '../imports.constants.js';

function createCsvStream(rows: Record<string, string>[]): Readable {
  if (rows.length === 0) {
    return Readable.from(Buffer.from('product_name,sku,price,store_slug\n'));
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => row[h] ?? '').join(','));
  }
  return Readable.from(Buffer.from(lines.join('\n') + '\n'));
}

describe('ImportProcessor', () => {
  let processor: ImportProcessor;
  let prisma: Record<string, any>;
  let mockSearchIndexQueue: { indexProduct: jest.Mock; indexProducts: jest.Mock };
  let mockAlertsQueue: { evaluate: jest.Mock };
  let mockStorage: { download: jest.Mock; delete: jest.Mock };

  const companyId = 'company-1';
  const importJobId = 'job-1';
  const fileKey = 'imports/company-1/test.csv';

  beforeEach(() => {
    prisma = {
      importJob: {
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({ id: importJobId, status: 'PROCESSING' }),
      },
      category: {
        findMany: jest.fn().mockResolvedValue([{ slug: 'electronics', id: 'cat-1' }]),
        findUnique: jest.fn().mockResolvedValue({ id: 'cat-1', slug: 'electronics' }),
      },
      store: {
        findMany: jest.fn().mockResolvedValue([{ slug: 'main-store', id: 'store-1' }]),
        findFirst: jest.fn().mockResolvedValue({ id: 'store-1', slug: 'main-store' }),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args: any) =>
          Promise.resolve({ id: `prod-${Date.now()}`, ...args.data }),
        ),
        update: jest.fn().mockImplementation((args: any) =>
          Promise.resolve({ id: args.where.id, ...args.data }),
        ),
      },
      brand: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args: any) =>
          Promise.resolve({ id: `brand-${Date.now()}`, ...args.data }),
        ),
      },
      productCategory: {
        upsert: jest.fn().mockResolvedValue({}),
      },
      price: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args: any) =>
          Promise.resolve({ id: `price-${Date.now()}`, ...args.data, value: { toNumber: () => args.data.value } }),
        ),
        update: jest.fn().mockResolvedValue({}),
      },
      inventory: {
        upsert: jest.fn().mockResolvedValue({}),
      },
      importError: {
        createMany: jest.fn().mockResolvedValue({}),
      },
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
    };

    mockSearchIndexQueue = {
      indexProduct: jest.fn().mockResolvedValue(undefined),
      indexProducts: jest.fn().mockResolvedValue(undefined),
    };
    mockAlertsQueue = {
      evaluate: jest.fn().mockResolvedValue(undefined),
    };
    mockStorage = {
      download: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    processor = new ImportProcessor(
      prisma as any,
      mockSearchIndexQueue as any,
      mockAlertsQueue as any,
      mockStorage as any,
    );
  });

  function createJob(overrides: Record<string, any> = {}) {
    return {
      data: { importJobId, companyId, fileKey, format: 'csv', ...overrides },
      updateProgress: jest.fn().mockResolvedValue(undefined),
    } as any;
  }

  describe('status transitions', () => {
    it('should transition PENDING → PROCESSING → COMPLETED', async () => {
      mockStorage.download.mockResolvedValue(
        createCsvStream([{ product_name: 'Widget', sku: 'W-001', price: '10.00', store_slug: 'main-store' }]),
      );

      await processor.process(createJob());

      const statusCalls = prisma.importJob.update.mock.calls
        .filter((c: any[]) => c[0].data?.status)
        .map((c: any[]) => c[0].data.status);

      expect(statusCalls).toContain('PROCESSING');
      expect(statusCalls).toContain('COMPLETED');
    });

    it('should set FAILED on unhandled error', async () => {
      mockStorage.download.mockRejectedValue(new Error('S3 down'));

      await expect(processor.process(createJob())).rejects.toThrow('S3 down');

      const lastCall = prisma.importJob.update.mock.calls.at(-1);
      expect(lastCall[0].data.status).toBe('FAILED');
      expect(lastCall[0].data.finishedAt).toBeDefined();
    });
  });

  describe('idempotency — same SKU twice', () => {
    it('should update existing product instead of creating duplicate', async () => {
      const existingProduct = { id: 'existing-prod', name: 'Old', sku: 'W-001', barcode: null, description: null };
      prisma.product.findUnique
        .mockResolvedValueOnce(existingProduct) // SKU lookup in upsertProduct
        .mockResolvedValueOnce(null);           // slug lookup (not reached)

      mockStorage.download.mockResolvedValue(
        createCsvStream([
          { product_name: 'Widget Updated', sku: 'W-001', price: '10.00', store_slug: 'main-store' },
        ]),
      );

      await processor.process(createJob());

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'existing-prod' },
          data: expect.objectContaining({ name: 'Widget Updated' }),
        }),
      );
      expect(prisma.product.create).not.toHaveBeenCalled();
    });
  });

  describe('price unchanged', () => {
    it('should not create new price record when value is identical', async () => {
      prisma.price.findFirst.mockResolvedValue({
        id: 'price-active',
        value: { toNumber: () => 19.90 },
        storeId: 'store-1',
        productId: 'prod-1',
        type: 'REGULAR',
        validTo: null,
      });

      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', sku: 'P-001' });

      mockStorage.download.mockResolvedValue(
        createCsvStream([
          { product_name: 'Widget', sku: 'P-001', price: '19.90', store_slug: 'main-store' },
        ]),
      );

      await processor.process(createJob());

      expect(prisma.price.create).not.toHaveBeenCalled();
      expect(prisma.price.update).not.toHaveBeenCalled();
    });
  });

  describe('price changed', () => {
    it('should close old price and create new one', async () => {
      prisma.price.findFirst.mockResolvedValue({
        id: 'price-old',
        value: { toNumber: () => 19.90 },
        storeId: 'store-1',
        productId: 'prod-1',
        type: 'REGULAR',
        validTo: null,
      });

      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', sku: 'P-001' });

      mockStorage.download.mockResolvedValue(
        createCsvStream([
          { product_name: 'Widget', sku: 'P-001', price: '29.90', store_slug: 'main-store' },
        ]),
      );

      await processor.process(createJob());

      expect(prisma.price.update).toHaveBeenCalledWith({
        where: { id: 'price-old' },
        data: { validTo: expect.any(Date) },
      });
      expect(prisma.price.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ value: 29.90, validTo: null }),
        }),
      );
    });
  });

  describe('cancel during processing', () => {
    it('should stop processing when job is cancelled', async () => {
      let checkCount = 0;
      prisma.importJob.findUnique.mockImplementation(() => {
        checkCount++;
        if (checkCount >= 2) {
          return Promise.resolve({ id: importJobId, status: 'CANCELLED' });
        }
        return Promise.resolve({ id: importJobId, status: 'PROCESSING' });
      });

      const rows = Array.from({ length: CANCEL_CHECK_INTERVAL * 2 + 10 }, (_, i) => ({
        product_name: `Product ${i}`,
        sku: `SKU-${i}`,
        price: '10.00',
        store_slug: 'main-store',
      }));

      mockStorage.download.mockResolvedValue(createCsvStream(rows));

      await processor.process(createJob());

      const lastStatusCall = prisma.importJob.update.mock.calls.at(-1);
      expect(lastStatusCall[0].data.status).toBe('CANCELLED');
    });
  });

  describe('partial failure + retry', () => {
    it('should process valid rows and record errors for invalid ones', async () => {
      const rows = [
        { product_name: 'Good Product', sku: 'G-001', price: '10.00', store_slug: 'main-store' },
        { product_name: 'Bad Price', sku: 'BAD-001', price: '-5.00', store_slug: 'main-store' },
        { product_name: 'Another Good', sku: 'G-002', price: '20.00', store_slug: 'main-store' },
      ];

      mockStorage.download.mockResolvedValue(createCsvStream(rows));

      await processor.process(createJob());

      expect(prisma.product.create).toHaveBeenCalledTimes(2);
      expect(prisma.importError.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ code: 'INVALID_DECIMAL' }),
          ]),
        }),
      );
    });
  });

  describe('SKU deduplication', () => {
    it('should update product with same SKU instead of creating new', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'existing-prod',
        name: 'Old Name',
        sku: 'DEDUP-001',
        barcode: null,
        description: null,
      });

      mockStorage.download.mockResolvedValue(
        createCsvStream([
          { product_name: 'New Name', sku: 'DEDUP-001', price: '5.00', store_slug: 'main-store' },
        ]),
      );

      await processor.process(createJob());

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'existing-prod' },
          data: expect.objectContaining({ name: 'New Name' }),
        }),
      );
      expect(prisma.product.create).not.toHaveBeenCalled();
    });
  });

  describe('indexing', () => {
    it('should batch-index all products after chunk processing', async () => {
      const rows = Array.from({ length: 3 }, (_, i) => ({
        product_name: `Product ${i}`,
        sku: `IDX-${i}`,
        price: '10.00',
        store_slug: 'main-store',
      }));

      mockStorage.download.mockResolvedValue(createCsvStream(rows));

      await processor.process(createJob());

      expect(mockSearchIndexQueue.indexProducts).toHaveBeenCalledTimes(1);
      expect(mockSearchIndexQueue.indexProducts).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(String)]),
      );
    });
  });

  describe('no SKU — slug generation', () => {
    it('should generate slug from product name', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      mockStorage.download.mockResolvedValue(
        createCsvStream([
          { product_name: 'My Cool Product!', price: '5.00', store_slug: 'main-store' },
        ]),
      );

      await processor.process(createJob());

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'my-cool-product' }),
        }),
      );
    });
  });

  describe('batch indexing vs per-row', () => {
    it('should NOT call indexProduct (per-row), only indexProducts (batch)', async () => {
      mockStorage.download.mockResolvedValue(
        createCsvStream([
          { product_name: 'Widget', sku: 'B-001', price: '10.00', store_slug: 'main-store' },
        ]),
      );

      await processor.process(createJob());

      expect(mockSearchIndexQueue.indexProduct).not.toHaveBeenCalled();
      expect(mockSearchIndexQueue.indexProducts).toHaveBeenCalledTimes(1);
    });
  });
});
