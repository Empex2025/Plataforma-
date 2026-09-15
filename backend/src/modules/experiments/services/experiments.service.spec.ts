import { jest } from '@jest/globals';
import { ExperimentsService } from './experiments.service.js';

const BASE_EXPERIMENT = {
  id: 'exp-1',
  key: 'recommendation-ranking-v1',
  domain: 'recommendation',
  name: 'Recommendation Ranking',
  description: null,
  status: 'DRAFT',
  startAt: null,
  endAt: null,
  targeting: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  variants: [
    { id: 'v-control', key: 'CONTROL', name: 'Control', allocation: 50, config: { recommendation_mode: 'deterministic' } },
    { id: 'v-treatment', key: 'TREATMENT', name: 'Treatment', allocation: 50, config: { recommendation_mode: 'hybrid' } },
  ],
};

function makePrisma(overrides: {
  experiment?: unknown;
  otherRunning?: unknown;
  existingVariants?: unknown[];
  assignmentCount?: number;
} = {}) {
  const prisma: Record<string, unknown> = {
    experiment: {
      findUnique: jest.fn(async () => overrides.experiment ?? null),
      findFirst: jest.fn(async () => overrides.otherRunning ?? null),
      create: jest.fn(async () => BASE_EXPERIMENT),
      update: jest.fn(async () => BASE_EXPERIMENT),
    },
    experimentVariant: {
      findMany: jest.fn(async () => overrides.existingVariants ?? []),
      update: jest.fn(async () => undefined),
      create: jest.fn(async () => undefined),
      delete: jest.fn(async () => undefined),
    },
    experimentAssignment: {
      count: jest.fn(async () => overrides.assignmentCount ?? 0),
    },
  };
  prisma.$transaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
  return prisma;
}

function makeAssignmentService() {
  return { invalidateAll: jest.fn() };
}

describe('ExperimentsService', () => {
  it('rejects a duplicate experiment key', async () => {
    const prisma = makePrisma({ experiment: BASE_EXPERIMENT });
    const service = new ExperimentsService(prisma as never, makeAssignmentService() as never);

    await expect(
      service.create({
        key: 'recommendation-ranking-v1',
        domain: 'recommendation',
        name: 'x',
        variants: [{ key: 'CONTROL', name: 'C', allocation: 100 }],
      }),
    ).rejects.toThrow(/already exists/);
  });

  it('rejects an invalid allocation on create before touching the database', async () => {
    const prisma = makePrisma({ experiment: null });
    const service = new ExperimentsService(prisma as never, makeAssignmentService() as never);

    await expect(
      service.create({
        key: 'new-experiment',
        domain: 'recommendation',
        name: 'x',
        variants: [
          { key: 'CONTROL', name: 'C', allocation: 60 },
          { key: 'TREATMENT', name: 'T', allocation: 30 },
        ],
      }),
    ).rejects.toThrow(/sum to 100/);
  });

  it('refuses to start a second RUNNING experiment in the same domain', async () => {
    const prisma = makePrisma({ experiment: BASE_EXPERIMENT, otherRunning: { key: 'other' } });
    const service = new ExperimentsService(prisma as never, makeAssignmentService() as never);

    await expect(service.start('exp-1')).rejects.toThrow(/Only one RUNNING/);
  });

  it('refuses to restart a COMPLETED experiment', async () => {
    const prisma = makePrisma({ experiment: { ...BASE_EXPERIMENT, status: 'COMPLETED' } });
    const service = new ExperimentsService(prisma as never, makeAssignmentService() as never);

    await expect(service.start('exp-1')).rejects.toThrow(/Completed experiments cannot be restarted/);
  });

  it('refuses to pause a non-running experiment', async () => {
    const prisma = makePrisma({ experiment: { ...BASE_EXPERIMENT, status: 'DRAFT' } });
    const service = new ExperimentsService(prisma as never, makeAssignmentService() as never);

    await expect(service.pause('exp-1')).rejects.toThrow(/Only RUNNING/);
  });

  it('refuses to complete a DRAFT experiment', async () => {
    const prisma = makePrisma({ experiment: BASE_EXPERIMENT });
    const service = new ExperimentsService(prisma as never, makeAssignmentService() as never);

    await expect(service.complete('exp-1')).rejects.toThrow(/Only RUNNING or PAUSED/);
  });

  it('freezes COMPLETED experiments against updates', async () => {
    const prisma = makePrisma({ experiment: { ...BASE_EXPERIMENT, status: 'COMPLETED' } });
    const service = new ExperimentsService(prisma as never, makeAssignmentService() as never);

    await expect(service.update('exp-1', { name: 'new' })).rejects.toThrow(/frozen/);
  });

  it('cannot remove a variant that already has assignments', async () => {
    const prisma = makePrisma({
      experiment: BASE_EXPERIMENT,
      existingVariants: BASE_EXPERIMENT.variants,
      assignmentCount: 3,
    });
    const service = new ExperimentsService(prisma as never, makeAssignmentService() as never);

    await expect(
      service.update('exp-1', {
        variants: [{ key: 'CONTROL', name: 'Control', allocation: 100 }],
      }),
    ).rejects.toThrow(/Cannot remove variant/);
  });

  it('starts an experiment and invalidates the assignment cache', async () => {
    const prisma = makePrisma({ experiment: BASE_EXPERIMENT, otherRunning: null });
    const assignmentService = makeAssignmentService();
    const service = new ExperimentsService(prisma as never, assignmentService as never);

    await service.start('exp-1');

    expect(assignmentService.invalidateAll).toHaveBeenCalled();
  });
});
