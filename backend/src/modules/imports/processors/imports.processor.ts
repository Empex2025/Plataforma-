import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/db/prisma.service.js';
import { IMPORTS_QUEUE, CHUNK_SIZE, CANCEL_CHECK_INTERVAL } from '../imports.constants.js';
import { ImportJobData, NormalizedImportRow, IMPORT_STORAGE } from '../imports.types.js';
import type { IImportStorage } from '../imports.types.js';
import { CsvImportParser } from '../parsers/csv.parser.js';
import { CsvNormalizer } from '../normalizers/csv.normalizer.js';
import { ImportValidator } from '../validators/import.validator.js';
import { ImportError } from '../imports.types.js';
import { SearchIndexQueue } from '@/modules/search/queues/search-index-queue.js';
import { AlertsQueue } from '@/modules/alerts/alerts.queue.js';

@Processor(IMPORTS_QUEUE)
export class ImportProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly searchIndexQueue: SearchIndexQueue,
    private readonly alertsQueue: AlertsQueue,
    @Inject(IMPORT_STORAGE) private readonly storage: IImportStorage,
  ) {
    super();
  }

  async process(job: Job<ImportJobData>): Promise<void> {
    const { importJobId, companyId, fileKey, format } = job.data;
    const startTime = Date.now();

    this.logger.log(`Processing import job: ${importJobId}`);

    try {
      await this.prisma.importJob.update({
        where: { id: importJobId },
        data: { status: 'PROCESSING', startedAt: new Date() },
      });

      const stream = await this.storage.download(fileKey);

      const parser = new CsvImportParser();
      if (!parser.supports(format)) {
        throw new Error(`Unsupported format: ${format}`);
      }

      const [categories, stores] = await Promise.all([
        this.prisma.category.findMany({ select: { slug: true, id: true } }),
        this.prisma.store.findMany({ where: { companyId }, select: { slug: true, id: true } }),
      ]);
      const categorySlugs = new Set(categories.map(c => c.slug));
      const storeSlugs = new Set(stores.map(s => s.slug));
      const storeIdBySlug = new Map(stores.map(s => [s.slug, s.id]));

      const normalizer = new CsvNormalizer();
      const validator = new ImportValidator();
      const errors: ImportError[] = [];
      let totalProcessed = 0;
      let totalSuccess = 0;
      let totalErrors = 0;
      let chunkBuffer: NormalizedImportRow[] = [];
      let rowsSinceCancelCheck = 0;
      let cancelled = false;
      const allIndexedProductIds: string[] = [];

      for await (const rawRow of parser.parse(stream)) {
        rowsSinceCancelCheck++;
        if (rowsSinceCancelCheck >= CANCEL_CHECK_INTERVAL) {
          rowsSinceCancelCheck = 0;
          const currentJob = await this.prisma.importJob.findUnique({ where: { id: importJobId } });
          if (currentJob?.status === 'CANCELLED') {
            this.logger.log(`Import job cancelled: ${importJobId}`);
            cancelled = true;
            break;
          }
        }

        const normalized = normalizer.normalize(rawRow);

        const lineErrors = [
          ...validator.validate(normalized),
          ...validator.validateCategoryExists(normalized, categorySlugs),
          ...validator.validateStoreBelongsToCompany(normalized, storeSlugs),
          ...validator.validatePriceDates(normalized),
        ];

        if (lineErrors.length > 0) {
          errors.push(...lineErrors);
          totalErrors += lineErrors.length;
        } else {
          chunkBuffer.push(normalized);
        }

        totalProcessed++;

        if (chunkBuffer.length >= CHUNK_SIZE) {
          const chunkResult = await this.processChunk(companyId, chunkBuffer, storeIdBySlug);
          totalSuccess += chunkResult.success;
          allIndexedProductIds.push(...chunkResult.indexedProductIds);
          chunkBuffer = [];

          await this.prisma.importJob.update({
            where: { id: importJobId },
            data: {
              processed: totalProcessed,
              success: totalSuccess,
              errors: totalErrors,
            },
          });

          await job.updateProgress(totalProcessed);
        }
      }

      if (!cancelled && chunkBuffer.length > 0) {
        const chunkResult = await this.processChunk(companyId, chunkBuffer, storeIdBySlug);
        totalSuccess += chunkResult.success;
        allIndexedProductIds.push(...chunkResult.indexedProductIds);
      }

      if (errors.length > 0) {
        await this.prisma.importError.createMany({
          data: errors.map(e => ({
            importJobId,
            line: e.line,
            field: e.field ?? null,
            code: e.code,
            message: e.message,
            value: e.value ?? null,
          })),
        });
      }

      const finalStatus = cancelled ? 'CANCELLED' : 'COMPLETED';
      await this.prisma.importJob.update({
        where: { id: importJobId },
        data: {
          status: finalStatus,
          processed: totalProcessed,
          success: totalSuccess,
          errors: totalErrors,
          finishedAt: new Date(),
        },
      });

      if (!cancelled) {
        await this.storage.delete(fileKey);
      }

      if (allIndexedProductIds.length > 0) {
        await this.searchIndexQueue.indexProducts(allIndexedProductIds);
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Import job ${finalStatus.toLowerCase()}: ${importJobId} - ${totalProcessed} processed, ${totalSuccess} success, ${totalErrors} errors, ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(`Import job failed: ${importJobId}`, error);

      await this.prisma.importJob.update({
        where: { id: importJobId },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          errorDetail: { message: error instanceof Error ? error.message : 'Unknown error' },
        },
      });

      throw error;
    }
  }

  private async processChunk(
    companyId: string,
    rows: NormalizedImportRow[],
    storeIdBySlug: Map<string, string>,
  ): Promise<{ success: number; indexedProductIds: string[] }> {
    let success = 0;
    const indexedProductIds: string[] = [];

    for (const row of rows) {
      try {
        const productId = await this.processRow(companyId, row, storeIdBySlug);
        if (productId) indexedProductIds.push(productId);
        success++;
      } catch (error) {
        this.logger.warn(`Failed to process row ${row.lineNumber}: ${error}`);
      }
    }

    return { success, indexedProductIds };
  }

  private async processRow(
    companyId: string,
    row: NormalizedImportRow,
    storeIdBySlug: Map<string, string>,
  ): Promise<string | null> {
    let productId: string | null = null;
    if (row.product?.name) {
      const product = await this.upsertProduct(companyId, row);
      productId = product.id;
    }

    if (row.brand?.slug && productId) {
      const brand = await this.upsertBrand(companyId, row);

      if (brand.id && productId) {
        await this.prisma.product.update({
          where: { id: productId },
          data: { brandId: brand.id },
        });
      }
    }

    if (row.category?.slug && productId) {
      const category = await this.prisma.category.findUnique({
        where: { slug: row.category.slug },
      });
      if (category) {
        await this.prisma.productCategory.upsert({
          where: {
            productId_categoryId: { productId, categoryId: category.id },
          },
          update: {},
          create: { productId, categoryId: category.id },
        });
      }
    }

    const storeId = row.store?.slug ? storeIdBySlug.get(row.store.slug) ?? null : null;

    if (row.price?.value !== undefined && productId && storeId) {
      await this.upsertPrice(storeId, productId, row);
      await this.alertsQueue.evaluate({
        storeId,
        productId,
        price: row.price?.value,
      });
    }

    if (row.inventory?.quantity !== undefined && productId && storeId) {
      await this.prisma.inventory.upsert({
        where: {
          storeId_productId: { storeId, productId },
        },
        update: { quantity: row.inventory.quantity },
        create: {
          storeId,
          productId,
          quantity: row.inventory.quantity,
        },
      });
      await this.alertsQueue.evaluate({
        storeId,
        productId,
        quantity: row.inventory.quantity,
      });
    }

    return productId;
  }

  private async upsertProduct(companyId: string, row: NormalizedImportRow) {
    if (row.product?.sku) {
      const existing = await this.prisma.product.findUnique({
        where: { companyId_sku: { companyId, sku: row.product.sku } },
      });

      if (existing) {
        return this.prisma.product.update({
          where: { id: existing.id },
          data: {
            name: row.product.name ?? existing.name,
            barcode: row.product.barcode ?? existing.barcode,
            description: row.product.description ?? existing.description,
          },
        });
      }
    }

    const slug = this.generateSlug(row.product?.name ?? '');

    let finalSlug = slug;
    let counter = 2;
    while (true) {
      const exists = await this.prisma.product.findUnique({
        where: { companyId_slug: { companyId, slug: finalSlug } },
      });
      if (!exists) break;
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    return this.prisma.product.create({
      data: {
        companyId,
        name: row.product?.name ?? '',
        slug: finalSlug,
        sku: row.product?.sku ?? null,
        barcode: row.product?.barcode ?? null,
        description: row.product?.description ?? null,
        status: 'ACTIVE',
      },
    });
  }

  private async upsertBrand(companyId: string, row: NormalizedImportRow) {
    const slug = row.brand?.slug ?? this.generateSlug(row.brand?.name ?? '');

    const existing = await this.prisma.brand.findUnique({
      where: { companyId_slug: { companyId, slug } },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.brand.create({
      data: {
        companyId,
        name: row.brand?.name ?? slug,
        slug,
      },
    });
  }

  private async upsertPrice(storeId: string, productId: string, row: NormalizedImportRow) {
    const type = row.price?.type ?? 'REGULAR';
    const value = row.price?.value ?? 0;

    const activePrice = await this.prisma.price.findFirst({
      where: {
        storeId,
        productId,
        type,
        validTo: null,
      },
    });

    if (activePrice) {
      if (activePrice.value.toNumber() === value) {
        return activePrice;
      }

      await this.prisma.price.update({
        where: { id: activePrice.id },
        data: { validTo: new Date() },
      });
    }

    return this.prisma.price.create({
      data: {
        storeId,
        productId,
        type,
        value,
        validFrom: row.price?.validFrom ?? new Date(),
        validTo: row.price?.validTo ?? null,
      },
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
