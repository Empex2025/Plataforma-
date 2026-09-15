import { jest } from '@jest/globals';
import { ExperimentAssignmentService } from './experiment-assignment.service.js';

const RUNNING_EXPERIMENT = {
  id: 'exp-1',
  key: 'recommendation-ranking-v1',
  domain: 'recommendation',
  status: 'RUNNING',
  startAt: null,
  endAt: null,
  targeting: {},
  variants: [
    { id: 'v-control', key: 'CONTROL', allocation: 50, config: { recommendation_mode: 'deterministic' } },
    { id: 'v-treatment', key: 'TREATMENT', allocation: 50, config: { recommendation_mode: 'hybrid' } },
  ],
};

function makePrisma(options: {
  experiment?: unknown;
  existingAssignment?: unknown;
  runningExperiment?: unknown;
  companyMembership?: unknown;
} = {}) {
  return {
    experiment: {
      findUnique: jest.fn(async () => options.experiment ?? null),
      findFirst: jest.fn(async () => options.runningExperiment ?? null),
    },
    experimentAssignment: {
      findUnique: jest.fn(async () => options.existingAssignment ?? null),
      upsert: jest.fn(async (args: { create: { variantId: string } }) => ({
        variantId: args.create.variantId,
        variant: RUNNING_EXPERIMENT.variants.find((v) => v.id === args.create.variantId),
      })),
    },
    userCompany: {
      findFirst: jest.fn(async () => options.companyMembership ?? null),
    },
  };
}

const subject = { type: 'user' as const, id: 'user-1' };

describe('ExperimentAssignmentService', () => {
  it('returns null for a DRAFT experiment', async () => {
    const prisma = makePrisma({ experiment: { ...RUNNING_EXPERIMENT, status: 'DRAFT' } });
    const service = new ExperimentAssignmentService(prisma as never);
    await expect(service.assign('recommendation-ranking-v1', subject)).resolves.toBeNull();
  });

  it('returns null for PAUSED and COMPLETED experiments', async () => {
    for (const status of ['PAUSED', 'COMPLETED']) {
      const prisma = makePrisma({ experiment: { ...RUNNING_EXPERIMENT, status } });
      const service = new ExperimentAssignmentService(prisma as never);
      await expect(service.assign('recommendation-ranking-v1', subject)).resolves.toBeNull();
    }
  });

  it('returns null for an unknown experiment', async () => {
    const prisma = makePrisma({ experiment: null });
    const service = new ExperimentAssignmentService(prisma as never);
    await expect(service.assign('missing', subject)).resolves.toBeNull();
  });

  it('assigns a variant for a RUNNING experiment', async () => {
    const prisma = makePrisma({ experiment: RUNNING_EXPERIMENT });
    const service = new ExperimentAssignmentService(prisma as never);

    const result = await service.assign('recommendation-ranking-v1', subject);

    expect(result).not.toBeNull();
    expect(['CONTROL', 'TREATMENT']).toContain(result!.variantKey);
    expect(result!.experimentKey).toBe('recommendation-ranking-v1');
    expect(prisma.experimentAssignment.upsert).toHaveBeenCalledTimes(1);
  });

  it('keeps an existing assignment stable without recomputing', async () => {
    const existing = {
      variantId: 'v-treatment',
      variant: { id: 'v-treatment', key: 'TREATMENT', config: { recommendation_mode: 'hybrid' } },
    };
    const prisma = makePrisma({ experiment: RUNNING_EXPERIMENT, existingAssignment: existing });
    const service = new ExperimentAssignmentService(prisma as never);

    const result = await service.assign('recommendation-ranking-v1', subject);

    expect(result!.variantKey).toBe('TREATMENT');
    expect(prisma.experimentAssignment.upsert).not.toHaveBeenCalled();
  });

  it('is deterministic: the same subject always gets the same variant', async () => {
    const first = new ExperimentAssignmentService(makePrisma({ experiment: RUNNING_EXPERIMENT }) as never);
    const second = new ExperimentAssignmentService(makePrisma({ experiment: RUNNING_EXPERIMENT }) as never);

    const a = await first.assign('recommendation-ranking-v1', subject);
    const b = await second.assign('recommendation-ranking-v1', subject);

    expect(a!.variantKey).toBe(b!.variantKey);
  });

  it('returns null when there is no subject', async () => {
    const service = new ExperimentAssignmentService(makePrisma({ experiment: RUNNING_EXPERIMENT }) as never);
    await expect(service.assign('recommendation-ranking-v1', null)).resolves.toBeNull();
  });

  it('respects the experiment time window', async () => {
    const future = new Date(Date.now() + 60_000);
    const prisma = makePrisma({ experiment: { ...RUNNING_EXPERIMENT, startAt: future } });
    const service = new ExperimentAssignmentService(prisma as never);
    await expect(service.assign('recommendation-ranking-v1', subject)).resolves.toBeNull();
  });

  it('enforces authenticated-only targeting', async () => {
    const prisma = makePrisma({
      experiment: { ...RUNNING_EXPERIMENT, targeting: { authenticated: true } },
    });
    const service = new ExperimentAssignmentService(prisma as never);
    await expect(
      service.assign('recommendation-ranking-v1', { type: 'session', id: 'sess-1' }),
    ).resolves.toBeNull();
  });

  it('enforces company targeting', async () => {
    const prisma = makePrisma({
      experiment: { ...RUNNING_EXPERIMENT, targeting: { companyIds: ['company-1'] } },
      companyMembership: null,
    });
    const service = new ExperimentAssignmentService(prisma as never);
    await expect(service.assign('recommendation-ranking-v1', subject)).resolves.toBeNull();
  });

  it('resolves the RUNNING experiment of a domain', async () => {
    const prisma = makePrisma({ experiment: RUNNING_EXPERIMENT, runningExperiment: RUNNING_EXPERIMENT });
    const service = new ExperimentAssignmentService(prisma as never);

    const result = await service.assignActiveInDomain('recommendation', subject);

    expect(result).not.toBeNull();
    expect(prisma.experiment.findFirst).toHaveBeenCalledTimes(1);
  });

  it('returns null when no experiment is RUNNING for the domain', async () => {
    const prisma = makePrisma({ runningExperiment: null });
    const service = new ExperimentAssignmentService(prisma as never);
    await expect(service.assignActiveInDomain('recommendation', subject)).resolves.toBeNull();
  });

  it('caches the experiment definition across assignments', async () => {
    const prisma = makePrisma({ experiment: RUNNING_EXPERIMENT });
    const service = new ExperimentAssignmentService(prisma as never);

    await service.assign('recommendation-ranking-v1', subject);
    await service.assign('recommendation-ranking-v1', subject);

    expect(prisma.experiment.findUnique).toHaveBeenCalledTimes(1);
  });
});
