import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { CreateImportDto } from '../dto/create-import.dto.js';
import { ImportResponseDto } from '../dto/import-response.dto.js';
import { ImportErrorResponseDto } from '../dto/import-error-response.dto.js';
import { IMPORTS_QUEUE, MAX_JOBS_PER_COMPANY } from '../imports.constants.js';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MulterFile, IMPORT_STORAGE } from '../imports.types.js';
import type { IImportStorage } from '../imports.types.js';
import { PlanAccessService } from '@/modules/plans/services/plan-access.service.js';
import { PlanFeature } from '@/modules/plans/plan.constants.js';
import { DEFAULT_JOB_OPTIONS } from '@/common/queue/job-options.js';
import { normalizePagination } from '@/common/pagination/pagination.constants.js';
import { resolveMembership } from '@/common/helpers/membership.js';

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planAccess: PlanAccessService,
    @InjectQueue(IMPORTS_QUEUE) private readonly importsQueue: Queue,
    @Inject(IMPORT_STORAGE) private readonly storage: IImportStorage,
  ) {}

  async create(
    companyId: string,
    userId: string,
    dto: CreateImportDto,
    file: MulterFile,
  ): Promise<ImportResponseDto> {
    await this.validateMembership(companyId, userId);
    await this.planAccess.assertWithinLimit(companyId, PlanFeature.MAX_IMPORTS);
    await this.validateRateLimit(companyId);
    this.validateFile(file);

    const fileKey = this.generateFileKey(companyId, file.originalname);

    const importJob = await this.prisma.importJob.create({
      data: {
        companyId,
        storeId: dto.storeId ?? null,
        type: 'CSV',
        status: 'PENDING',
        fileName: file.originalname,
        fileKey,
      },
    });

    try {
      await this.storage.upload(file, fileKey);
    } catch (error) {
      await this.prisma.importJob
        .update({ where: { id: importJob.id }, data: { status: 'FAILED' } })
        .catch(() => undefined);
      this.logger.error(`Failed to store file for import job ${importJob.id}`, error as Error);
      throw new ServiceUnavailableException('File storage is temporarily unavailable');
    }

    await this.importsQueue.add(
      'process-import',
      {
        importJobId: importJob.id,
        companyId,
        fileKey,
        format: 'csv',
      },
      { ...DEFAULT_JOB_OPTIONS },
    );

    this.logger.log(`Import job created: ${importJob.id} for company: ${companyId}`);

    return ImportResponseDto.fromPlain(importJob);
  }

  async listByCompany(
    companyId: string,
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: ImportResponseDto[]; total: number }> {
    await this.validateMembership(companyId, userId);

    const { limit: safeLimit, skip } = normalizePagination(page, limit);

    const [jobs, total] = await Promise.all([
      this.prisma.importJob.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.importJob.count({
        where: { companyId },
      }),
    ]);

    return {
      data: jobs.map(ImportResponseDto.fromPlain),
      total,
    };
  }

  async findById(
    companyId: string,
    importId: string,
    userId: string,
  ): Promise<ImportResponseDto> {
    await this.validateMembership(companyId, userId);

    const importJob = await this.prisma.importJob.findUnique({
      where: { id: importId },
    });

    if (!importJob || importJob.companyId !== companyId) {
      throw new NotFoundException('Import job not found');
    }

    return ImportResponseDto.fromPlain(importJob);
  }

  async findErrors(
    companyId: string,
    importId: string,
    userId: string,
    page = 1,
    limit = 50,
  ): Promise<{ data: ImportErrorResponseDto[]; total: number }> {
    await this.validateMembership(companyId, userId);

    const importJob = await this.prisma.importJob.findUnique({
      where: { id: importId },
    });

    if (!importJob || importJob.companyId !== companyId) {
      throw new NotFoundException('Import job not found');
    }

    const { limit: safeLimit, skip } = normalizePagination(page, limit);

    const [errors, total] = await Promise.all([
      this.prisma.importError.findMany({
        where: { importJobId: importId },
        orderBy: { line: 'asc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.importError.count({
        where: { importJobId: importId },
      }),
    ]);

    return {
      data: errors.map(ImportErrorResponseDto.fromPlain),
      total,
    };
  }

  async cancel(
    companyId: string,
    importId: string,
    userId: string,
  ): Promise<void> {
    await this.validateMembership(companyId, userId);

    const importJob = await this.prisma.importJob.findUnique({
      where: { id: importId },
    });

    if (!importJob || importJob.companyId !== companyId) {
      throw new NotFoundException('Import job not found');
    }

    if (importJob.status !== 'PENDING' && importJob.status !== 'PROCESSING') {
      throw new BadRequestException(`Cannot cancel import with status: ${importJob.status}`);
    }

    await this.prisma.importJob.update({
      where: { id: importId },
      data: { status: 'CANCELLED' },
    });

    this.logger.log(`Import job cancelled: ${importId}`);
  }

  private async validateMembership(companyId: string, userId: string): Promise<void> {
    await resolveMembership(this.prisma, companyId, userId);
  }

  private async validateRateLimit(companyId: string): Promise<void> {
    const activeJobs = await this.prisma.importJob.count({
      where: {
        companyId,
        status: {
          in: ['PENDING', 'PROCESSING'],
        },
      },
    });

    if (activeJobs >= MAX_JOBS_PER_COMPANY) {
      throw new ConflictException(
        `Rate limit exceeded. Maximum ${MAX_JOBS_PER_COMPANY} concurrent imports per company.`,
      );
    }
  }

  private validateFile(file: MulterFile): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const allowedMimeTypes = ['text/csv', 'application/csv', 'text/plain'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only CSV files are allowed.');
    }

    const maxSizeMB = 50;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(`File size exceeds maximum limit of ${maxSizeMB}MB`);
    }
  }

  private generateFileKey(companyId: string, fileName: string): string {
    const timestamp = Date.now();
    const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `imports/${companyId}/${timestamp}_${sanitized}`;
  }
}
