import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
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

    await this.storage.upload(file, fileKey);

    await this.importsQueue.add(
      'process-import',
      {
        importJobId: importJob.id,
        companyId,
        fileKey,
        format: 'csv',
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
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

    const [jobs, total] = await Promise.all([
      this.prisma.importJob.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
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

    const [errors, total] = await Promise.all([
      this.prisma.importError.findMany({
        where: { importJobId: importId },
        orderBy: { line: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
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
    const userCompany = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: { userId, companyId },
      },
    });

    if (!userCompany) {
      throw new ForbiddenException('User does not belong to this company');
    }
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
