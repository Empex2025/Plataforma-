import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { CreateExperimentDto } from '../dto/create-experiment.dto.js';
import { UpdateExperimentDto } from '../dto/update-experiment.dto.js';
import { ExperimentResponseDto } from '../dto/experiment-response.dto.js';
import { validateAllocation } from '../helpers/allocation.js';
import { ExperimentAssignmentService } from './experiment-assignment.service.js';
import type { Prisma } from '@/generated/prisma/client.js';

type ExperimentWithVariants = {
  id: string;
  key: string;
  domain: string;
  name: string;
  description: string | null;
  status: string;
  startAt: Date | null;
  endAt: Date | null;
  targeting: unknown;
  createdAt: Date;
  updatedAt: Date;
  variants: Array<{
    id: string;
    key: string;
    name: string;
    allocation: number;
    config: unknown;
  }>;
};

@Injectable()
export class ExperimentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignmentService: ExperimentAssignmentService,
  ) {}

  async create(dto: CreateExperimentDto): Promise<ExperimentResponseDto> {
    validateAllocation(dto.variants);

    const existing = await this.prisma.experiment.findUnique({ where: { key: dto.key } });
    if (existing) {
      throw new ConflictException(`Experiment key "${dto.key}" already exists`);
    }

    const experiment = await this.prisma.experiment.create({
      data: {
        key: dto.key,
        domain: dto.domain,
        name: dto.name,
        description: dto.description ?? null,
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        targeting: (dto.targeting ?? undefined) as Prisma.InputJsonValue | undefined,
        variants: {
          create: dto.variants.map((variant, index) => ({
            key: variant.key,
            name: variant.name,
            allocation: variant.allocation,
            config: (variant.config ?? undefined) as Prisma.InputJsonValue | undefined,
            // preserve submitted order for deterministic cumulative allocation
            createdAt: new Date(Date.now() + index),
          })),
        },
      },
      include: { variants: { orderBy: { createdAt: 'asc' } } },
    });

    this.assignmentService.invalidateAll();
    return this.toResponse(experiment);
  }

  async findAll(): Promise<ExperimentResponseDto[]> {
    const experiments = await this.prisma.experiment.findMany({
      include: { variants: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return experiments.map((experiment) => this.toResponse(experiment));
  }

  async findById(id: string): Promise<ExperimentResponseDto> {
    const experiment = await this.prisma.experiment.findUnique({
      where: { id },
      include: { variants: { orderBy: { createdAt: 'asc' } } },
    });
    if (!experiment) throw new NotFoundException('Experiment not found');
    return this.toResponse(experiment);
  }

  async update(id: string, dto: UpdateExperimentDto): Promise<ExperimentResponseDto> {
    const experiment = await this.loadForWrite(id);

    if (experiment.status === 'COMPLETED') {
      throw new BadRequestException('Completed experiments are frozen and cannot be updated');
    }

    if (dto.variants) {
      validateAllocation(dto.variants);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.experiment.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.startAt !== undefined && { startAt: new Date(dto.startAt) }),
          ...(dto.endAt !== undefined && { endAt: new Date(dto.endAt) }),
          ...(dto.targeting !== undefined && {
            targeting: dto.targeting as unknown as Prisma.InputJsonValue,
          }),
        },
      });

      if (dto.variants) {
        await this.syncVariants(tx, id, dto.variants);
      }
    });

    this.assignmentService.invalidateAll();
    return this.findById(id);
  }

  async start(id: string): Promise<ExperimentResponseDto> {
    const experiment = await this.loadForWrite(id);

    if (experiment.status === 'RUNNING') {
      throw new BadRequestException('Experiment is already running');
    }
    if (experiment.status === 'COMPLETED') {
      throw new BadRequestException('Completed experiments cannot be restarted');
    }

    validateAllocation(experiment.variants);

    const otherRunning = await this.prisma.experiment.findFirst({
      where: { domain: experiment.domain, status: 'RUNNING', id: { not: id } },
      select: { key: true },
    });
    if (otherRunning) {
      throw new ConflictException(
        `Another RUNNING "${experiment.domain}" experiment already exists ("${otherRunning.key}"). ` +
          'Only one RUNNING experiment per domain is allowed in v1.',
      );
    }

    await this.prisma.experiment.update({
      where: { id },
      data: { status: 'RUNNING', startAt: experiment.startAt ?? new Date() },
    });

    this.assignmentService.invalidateAll();
    return this.findById(id);
  }

  async pause(id: string): Promise<ExperimentResponseDto> {
    const experiment = await this.loadForWrite(id);
    if (experiment.status !== 'RUNNING') {
      throw new BadRequestException('Only RUNNING experiments can be paused');
    }

    await this.prisma.experiment.update({ where: { id }, data: { status: 'PAUSED' } });
    this.assignmentService.invalidateAll();
    return this.findById(id);
  }

  async complete(id: string): Promise<ExperimentResponseDto> {
    const experiment = await this.loadForWrite(id);
    if (experiment.status !== 'RUNNING' && experiment.status !== 'PAUSED') {
      throw new BadRequestException('Only RUNNING or PAUSED experiments can be completed');
    }

    await this.prisma.experiment.update({
      where: { id },
      data: { status: 'COMPLETED', endAt: new Date() },
    });
    this.assignmentService.invalidateAll();
    return this.findById(id);
  }

  private async loadForWrite(id: string): Promise<ExperimentWithVariants> {
    const experiment = await this.prisma.experiment.findUnique({
      where: { id },
      include: { variants: { orderBy: { createdAt: 'asc' } } },
    });
    if (!experiment) throw new NotFoundException('Experiment not found');
    return experiment;
  }

  /**
   * Updates variants in place (by key) so existing assignments keep pointing to
   * the same variant. A variant with assignments can never be removed.
   */
  private async syncVariants(
    tx: Prisma.TransactionClient,
    experimentId: string,
    incoming: Array<{ key: string; name: string; allocation: number; config?: Record<string, unknown> }>,
  ): Promise<void> {
    const existing = await tx.experimentVariant.findMany({ where: { experimentId } });
    const existingByKey = new Map(existing.map((variant) => [variant.key, variant]));
    const incomingKeys = new Set(incoming.map((variant) => variant.key));

    for (const variant of incoming) {
      const current = existingByKey.get(variant.key);
      if (current) {
        await tx.experimentVariant.update({
          where: { id: current.id },
          data: {
            name: variant.name,
            allocation: variant.allocation,
            config: (variant.config ?? undefined) as Prisma.InputJsonValue | undefined,
          },
        });
      } else {
        await tx.experimentVariant.create({
          data: {
            experimentId,
            key: variant.key,
            name: variant.name,
            allocation: variant.allocation,
            config: (variant.config ?? undefined) as Prisma.InputJsonValue | undefined,
          },
        });
      }
    }

    for (const current of existing) {
      if (incomingKeys.has(current.key)) continue;

      const assignments = await tx.experimentAssignment.count({ where: { variantId: current.id } });
      if (assignments > 0) {
        throw new BadRequestException(
          `Cannot remove variant "${current.key}" while it has existing assignments`,
        );
      }
      await tx.experimentVariant.delete({ where: { id: current.id } });
    }
  }

  private toResponse(experiment: ExperimentWithVariants): ExperimentResponseDto {
    return {
      id: experiment.id,
      key: experiment.key,
      domain: experiment.domain,
      name: experiment.name,
      description: experiment.description,
      status: experiment.status,
      startAt: experiment.startAt,
      endAt: experiment.endAt,
      targeting: (experiment.targeting ?? null) as Record<string, unknown> | null,
      createdAt: experiment.createdAt,
      updatedAt: experiment.updatedAt,
      variants: experiment.variants.map((variant) => ({
        id: variant.id,
        key: variant.key,
        name: variant.name,
        allocation: variant.allocation,
        config: (variant.config ?? null) as Record<string, unknown> | null,
      })),
    };
  }
}
