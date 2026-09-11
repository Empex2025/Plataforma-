import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../db/prisma.service.js';
import { IMPORTS_QUEUE, CHUNK_SIZE } from './imports.constants.js';
import { ImportJobData, NormalizedImportRow } from './imports.types.js';
import { S3Storage } from './storage/s3.storage.js';
import { CsvImportParser } from './parsers/csv.parser.js';
import { CsvNormalizer } from './normalizers/csv.normalizer.js';
import { ImportValidator } from './validators/import.validator.js';
import { ImportError } from './imports.types.js';

@Processor(IMPORTS_QUEUE)
export class ImportProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportProcessor.name);

  constructor() {
    super();
  }

  async process(job: Job<ImportJobData>): Promise<void> {
    const { importJobId, companyId, fileKey, format } = job.data;
    const startTime = Date.now();

    this.logger.log(`Processing import job: ${importJobId}`);

    const prisma = new PrismaService();
    await prisma.$connect();

    try {
      await prisma.importJob.update({
        where: { id: importJobId },
        data: { status: 'PROCESSING', startedAt: new Date() },
      });

      const storage = new S3Storage();
      const stream = await storage.download(fileKey);

      const parser = new CsvImportParser();
      if (!parser.supports(format)) {
        throw new Error(`Unsupported format: ${format}`);
      }

      const [categories, stores] = await Promise.all([
        prisma.category.findMany({ select: { slug: true } }),
        prisma.store.findMany({ where: { companyId }, select: { slug: true } }),
      ]);
      const categorySlugs = new Set(categories.map(c => c.slug));
      const storeSlugs = new Set(stores.map(s => s.slug));

      const normalizer = new CsvNormalizer();
      const validator = new ImportValidator();
      const errors: ImportError[] = [];
      let totalProcessed = 0;
      let totalSuccess = 0;
      let totalErrors = 0;
      let chunkBuffer: NormalizedImportRow[] = [];

      for await (const rawRow of parser.parse(stream)) {
        const currentJob = await prisma.importJob.findUnique({ where: { id: importJobId } });
        if (currentJob?.status === 'CANCELLED') {
          this.logger.log(`Import job cancelled: ${importJobId}`);
          break;
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
          const chunkResult = await this.processChunk(prisma, companyId, chunkBuffer);
          totalSuccess += chunkResult.success;
          chunkBuffer = [];

          await prisma.importJob.update({
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

      if (chunkBuffer.length > 0) {
        const chunkResult = await this.processChunk(prisma, companyId, chunkBuffer);
        totalSuccess += chunkResult.success;
      }

      if (errors.length > 0) {
        await prisma.importError.createMany({
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

      const finalStatus = totalErrors > 0 ? 'COMPLETED' : 'COMPLETED';
      await prisma.importJob.update({
        where: { id: importJobId },
        data: {
          status: finalStatus,
          processed: totalProcessed,
          success: totalSuccess,
          errors: totalErrors,
          finishedAt: new Date(),
        },
      });

      await storage.delete(fileKey);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Import job completed: ${importJobId} - ${totalProcessed} processed, ${totalSuccess} success, ${totalErrors} errors, ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(`Import job failed: ${importJobId}`, error);

      await prisma.importJob.update({
        where: { id: importJobId },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          errorDetail: { message: error instanceof Error ? error.message : 'Unknown error' },
        },
      });

      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  private async processChunk(
    prisma: PrismaService,
    companyId: string,
    rows: NormalizedImportRow[],
  ): Promise<{ success: number }> {
    let success = 0;

    for (const row of rows) {
      try {
        await this.processRow(prisma, companyId, row);
        success++;
      } catch (error) {
        this.logger.warn(`Failed to process row ${row.lineNumber}: ${error}`);
      }
    }

    return { success };
  }

  private async processRow(
    prisma: PrismaService,
    companyId: string,
    row: NormalizedImportRow,
  ): Promise<void> {
    let productId: string | null = null;
    if (row.product?.name) {
      const product = await this.upsertProduct(prisma, companyId, row);
      productId = product.id;
    }

    let brandId: string | null = null;
    if (row.brand?.slug && productId) {
      const brand = await this.upsertBrand(prisma, companyId, row);
      brandId = brand.id;

      if (brandId && productId) {
        await prisma.product.update({
          where: { id: productId },
          data: { brandId },
        });
      }
    }

    if (row.category?.slug && productId) {
      const category = await prisma.category.findUnique({
        where: { slug: row.category.slug },
      });
      if (category) {
        await prisma.productCategory.upsert({
          where: {
            productId_categoryId: { productId, categoryId: category.id },
          },
          update: {},
          create: { productId, categoryId: category.id },
        });
      }
    }

    if (row.price?.value !== undefined && productId) {
      let storeId: string | null = null;

      if (row.store?.slug) {
        const store = await prisma.store.findFirst({
          where: { companyId, slug: row.store.slug },
        });
        storeId = store?.id ?? null;
      }

      if (storeId) {
        await this.upsertPrice(prisma, storeId, productId, row);
      }
    }

    if (row.inventory?.quantity !== undefined && productId) {
      let storeId: string | null = null;

      if (row.store?.slug) {
        const store = await prisma.store.findFirst({
          where: { companyId, slug: row.store.slug },
        });
        storeId = store?.id ?? null;
      }

      if (storeId) {
        await prisma.inventory.upsert({
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
      }
    }
  }

  private async upsertProduct(
    prisma: PrismaService,
    companyId: string,
    row: NormalizedImportRow,
  ) {
    if (row.product?.sku) {
      const existing = await prisma.product.findUnique({
        where: { companyId_sku: { companyId, sku: row.product.sku } },
      });

      if (existing) {
        return prisma.product.update({
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
      const exists = await prisma.product.findUnique({
        where: { companyId_slug: { companyId, slug: finalSlug } },
      });
      if (!exists) break;
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    return prisma.product.create({
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

  private async upsertBrand(
    prisma: PrismaService,
    companyId: string,
    row: NormalizedImportRow,
  ) {
    const slug = row.brand?.slug ?? this.generateSlug(row.brand?.name ?? '');

    const existing = await prisma.brand.findUnique({
      where: { companyId_slug: { companyId, slug } },
    });

    if (existing) {
      return existing;
    }

    return prisma.brand.create({
      data: {
        companyId,
        name: row.brand?.name ?? slug,
        slug,
      },
    });
  }

  private async upsertPrice(
    prisma: PrismaService,
    storeId: string,
    productId: string,
    row: NormalizedImportRow,
  ) {
    const type = row.price?.type ?? 'REGULAR';
    const value = row.price?.value ?? 0;

    const activePrice = await prisma.price.findFirst({
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

      await prisma.price.update({
        where: { id: activePrice.id },
        data: { validTo: new Date() },
      });
    }

    return prisma.price.create({
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
