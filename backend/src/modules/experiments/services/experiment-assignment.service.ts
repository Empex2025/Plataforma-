import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { EXPERIMENT_CACHE_TTL_MS } from '../experiments.constants.js';
import type {
  AssignmentResult,
  ExperimentSubject,
  ExperimentTargeting,
  VariantConfig,
} from '../experiments.types.js';
import { selectVariantByAllocation, stableBucket } from '../helpers/bucket.js';

interface CachedExperimentVariant {
  id: string;
  key: string;
  allocation: number;
  config: VariantConfig;
}

interface CachedExperiment {
  id: string;
  key: string;
  domain: string;
  status: string;
  startAt: Date | null;
  endAt: Date | null;
  targeting: ExperimentTargeting;
  variants: CachedExperimentVariant[];
}

@Injectable()
export class ExperimentAssignmentService {
  private readonly logger = new Logger(ExperimentAssignmentService.name);
  private readonly cache = new Map<string, { experiment: CachedExperiment | null; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  invalidateAll(): void {
    this.cache.clear();
  }

  async assign(experimentKey: string, subject: ExperimentSubject | null | undefined): Promise<AssignmentResult | null> {
    if (!subject?.id) return null;

    const experiment = await this.getExperimentByKey(experimentKey);
    if (!experiment || experiment.status !== 'RUNNING') return null;
    if (!this.withinWindow(experiment)) return null;
    if (!(await this.matchesTargeting(experiment, subject))) return null;

    const existing = await this.prisma.experimentAssignment.findUnique({
      where: {
        experimentId_subjectType_subjectId: {
          experimentId: experiment.id,
          subjectType: subject.type,
          subjectId: subject.id,
        },
      },
      include: { variant: true },
    });

    if (existing) {
      return this.toResult(experiment, existing.variant.id, existing.variant.key, existing.variant.config as VariantConfig);
    }

    const bucket = stableBucket(`${subject.type}:${subject.id}:${experiment.key}`);
    const variant = selectVariantByAllocation(experiment.variants, bucket);
    if (!variant) return null;

    const saved = await this.prisma.experimentAssignment.upsert({
      where: {
        experimentId_subjectType_subjectId: {
          experimentId: experiment.id,
          subjectType: subject.type,
          subjectId: subject.id,
        },
      },
      create: {
        experimentId: experiment.id,
        subjectType: subject.type,
        subjectId: subject.id,
        variantId: variant.id,
      },
      update: {},
      include: { variant: true },
    });

    return this.toResult(
      experiment,
      saved.variant.id,
      saved.variant.key,
      saved.variant.config as VariantConfig,
    );
  }

  async assignActiveInDomain(
    domain: string,
    subject: ExperimentSubject | null | undefined,
  ): Promise<AssignmentResult | null> {
    const experiment = await this.getRunningExperiment(domain);
    if (!experiment) return null;
    return this.assign(experiment.key, subject);
  }

  private async getExperimentByKey(key: string): Promise<CachedExperiment | null> {
    const cacheKey = `key:${key}`;
    const cached = this.readCache(cacheKey);
    if (cached !== undefined) return cached;

    const experiment = await this.prisma.experiment.findUnique({
      where: { key },
      include: { variants: true },
    });
    const mapped = experiment ? this.mapExperiment(experiment) : null;
    this.writeCache(cacheKey, mapped);
    return mapped;
  }

  private async getRunningExperiment(domain: string): Promise<CachedExperiment | null> {
    const cacheKey = `domain:${domain}`;
    const cached = this.readCache(cacheKey);
    if (cached !== undefined) return cached;

    const experiment = await this.prisma.experiment.findFirst({
      where: { domain, status: 'RUNNING' },
      include: { variants: true },
    });
    const mapped = experiment ? this.mapExperiment(experiment) : null;
    this.writeCache(cacheKey, mapped);
    return mapped;
  }

  private mapExperiment(experiment: {
    id: string;
    key: string;
    domain: string;
    status: string;
    startAt: Date | null;
    endAt: Date | null;
    targeting: unknown;
    variants: Array<{ id: string; key: string; allocation: number; config: unknown }>;
  }): CachedExperiment {
    return {
      id: experiment.id,
      key: experiment.key,
      domain: experiment.domain,
      status: experiment.status,
      startAt: experiment.startAt,
      endAt: experiment.endAt,
      targeting: (experiment.targeting ?? {}) as ExperimentTargeting,
      variants: experiment.variants.map((variant) => ({
        id: variant.id,
        key: variant.key,
        allocation: variant.allocation,
        config: (variant.config ?? {}) as VariantConfig,
      })),
    };
  }

  private withinWindow(experiment: CachedExperiment): boolean {
    const now = Date.now();
    if (experiment.startAt && experiment.startAt.getTime() > now) return false;
    if (experiment.endAt && experiment.endAt.getTime() < now) return false;
    return true;
  }

  private async matchesTargeting(
    experiment: CachedExperiment,
    subject: ExperimentSubject,
  ): Promise<boolean> {
    const targeting = experiment.targeting ?? {};

    if (targeting.authenticated === true && subject.type !== 'user') return false;
    if (targeting.authenticated === false && subject.type !== 'session') return false;

    if (targeting.companyIds && targeting.companyIds.length > 0) {
      if (subject.type !== 'user') return false;
      const membership = await this.prisma.userCompany.findFirst({
        where: { userId: subject.id, companyId: { in: targeting.companyIds } },
        select: { userId: true },
      });
      if (!membership) return false;
    }

    return true;
  }

  private toResult(
    experiment: CachedExperiment,
    variantId: string,
    variantKey: string,
    config: VariantConfig,
  ): AssignmentResult {
    return {
      experimentId: experiment.id,
      experimentKey: experiment.key,
      variantId,
      variantKey,
      config: config ?? {},
    };
  }

  private readCache(key: string): CachedExperiment | null | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.experiment;
  }

  private writeCache(key: string, experiment: CachedExperiment | null): void {
    this.cache.set(key, { experiment, expiresAt: Date.now() + EXPERIMENT_CACHE_TTL_MS });
  }
}
