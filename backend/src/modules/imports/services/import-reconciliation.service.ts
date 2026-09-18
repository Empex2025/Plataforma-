import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { IMPORT_STORAGE } from '../imports.types.js';
import type { IImportStorage, StorageObjectInfo } from '../imports.types.js';

export const DEFAULT_RECONCILIATION_PREFIX = 'imports/';
export const DEFAULT_RECONCILIATION_WINDOW_DAYS = 30;
export const DEFAULT_RECONCILIATION_SAMPLE_LIMIT = 50;
const MAX_RECONCILIATION_SAMPLE_LIMIT = 500;

export interface ReconciliationOptions {
  prefix?: string;
  sinceDays?: number;
  sampleLimit?: number;
}

export interface ImportJobRef {
  id: string;
  companyId: string;
  fileKey: string;
  status: string;
  createdAt: Date;
}

export interface ReconciliationReport {
  generatedAt: string;
  prefix: string;
  sinceDays: number;
  jobsScanned: number;
  objectsScanned: number;
  jobsMissingObject: {
    count: number;
    sample: ImportJobRef[];
  };
  objectsMissingJob: {
    count: number;
    sample: StorageObjectInfo[];
  };
}

/**
 * Read-only storage reconciliation diagnostic (P-05).
 *
 * Detects inconsistencies between ImportJob rows and stored objects:
 *  1. ImportJob exists + object exists (consistent)
 *  2. ImportJob exists + object missing
 *  3. Object exists + ImportJob missing
 *
 * It NEVER deletes anything. Any cleanup must be a separate, explicitly safe step.
 */
@Injectable()
export class ImportReconciliationService {
  private readonly logger = new Logger(ImportReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(IMPORT_STORAGE) private readonly storage: IImportStorage,
  ) {}

  async reconcile(options: ReconciliationOptions = {}): Promise<ReconciliationReport> {
    const prefix = options.prefix?.trim() || DEFAULT_RECONCILIATION_PREFIX;
    const sinceDays = this.normalizePositiveInt(
      options.sinceDays,
      DEFAULT_RECONCILIATION_WINDOW_DAYS,
    );
    const sampleLimit = Math.min(
      this.normalizePositiveInt(
        options.sampleLimit,
        DEFAULT_RECONCILIATION_SAMPLE_LIMIT,
      ),
      MAX_RECONCILIATION_SAMPLE_LIMIT,
    );

    const cutoff = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

    const [jobs, objects] = await Promise.all([
      this.prisma.importJob.findMany({
        where: { createdAt: { gte: cutoff } },
        select: {
          id: true,
          companyId: true,
          fileKey: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.listObjects(prefix),
    ]);

    const objectKeys = new Set(objects.map((object) => object.key));
    const jobKeys = new Set(jobs.map((job) => job.fileKey));

    const jobsMissingObject = jobs.filter((job) => !objectKeys.has(job.fileKey));
    const objectsMissingJob = objects.filter((object) => !jobKeys.has(object.key));

    if (jobsMissingObject.length > 0 || objectsMissingJob.length > 0) {
      this.logger.warn(
        `Reconciliation found inconsistencies: ${jobsMissingObject.length} job(s) without object, ${objectsMissingJob.length} object(s) without job`,
      );
    }

    return {
      generatedAt: new Date().toISOString(),
      prefix,
      sinceDays,
      jobsScanned: jobs.length,
      objectsScanned: objects.length,
      jobsMissingObject: {
        count: jobsMissingObject.length,
        sample: jobsMissingObject.slice(0, sampleLimit),
      },
      objectsMissingJob: {
        count: objectsMissingJob.length,
        sample: objectsMissingJob.slice(0, sampleLimit),
      },
    };
  }

  private async listObjects(prefix: string): Promise<StorageObjectInfo[]> {
    try {
      return await this.storage.list(prefix);
    } catch (error) {
      this.logger.error('Failed to list storage objects for reconciliation', error as Error);
      throw new ServiceUnavailableException('File storage is temporarily unavailable');
    }
  }

  private normalizePositiveInt(value: number | undefined, fallback: number): number {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
  }
}
