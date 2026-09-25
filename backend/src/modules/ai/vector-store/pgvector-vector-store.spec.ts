import { jest } from '@jest/globals';
import { PgVectorStore } from './pgvector-vector-store.js';
import type { PrismaService } from '@/db/prisma.service.js';

function makePrisma() {
  return {
    $queryRaw: jest.fn(),
    embedding: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

function makeStore(prisma: ReturnType<typeof makePrisma>) {
  return new PgVectorStore(prisma as unknown as PrismaService);
}

describe('PgVectorStore', () => {
  it('reports availability based on the vector extension', async () => {
    const prisma = makePrisma();
    prisma.$queryRaw.mockResolvedValue([{ exists: true }]);
    await expect(makeStore(prisma).isAvailable()).resolves.toBe(true);

    prisma.$queryRaw.mockRejectedValue(new Error('boom'));
    await expect(makeStore(prisma).isAvailable()).resolves.toBe(false);
  });

  it('persists embeddings through the Prisma model', async () => {
    const prisma = makePrisma();
    const store = makeStore(prisma);

    await store.upsert({
      entityType: 'product',
      entityId: 'p1',
      model: 'local-deterministic',
      version: 'v1',
      dimension: 3,
      contentHash: 'hash',
      vector: [1, 0, 0],
    });

    expect(prisma.embedding.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ entityId: 'p1', vector: [1, 0, 0] }),
      }),
    );
  });

  it('implements get() using the Prisma model', async () => {
    const prisma = makePrisma();
    const store = makeStore(prisma);

    prisma.embedding.findUnique.mockResolvedValueOnce(null);
    await expect(store.get('product', 'p1', 'm', 'v1')).resolves.toBeNull();

    prisma.embedding.findUnique.mockResolvedValueOnce({
      entityType: 'product',
      entityId: 'p1',
      model: 'm',
      version: 'v1',
      dimension: 3,
      contentHash: 'hash',
      vector: [1, 0, 0],
    });
    await expect(store.get('product', 'p1', 'm', 'v1')).resolves.toMatchObject({
      entityId: 'p1',
      vector: [1, 0, 0],
    });
  });

  it('filters by allowedIds and maps distance to score', async () => {
    const prisma = makePrisma();
    const store = makeStore(prisma);
    prisma.$queryRaw.mockResolvedValue([
      { entity_id: 'a', distance: 0.1 },
      { entity_id: 'b', distance: 0.2 },
    ]);

    const matches = await store.findSimilar('product', [1, 0, 0], {
      limit: 5,
      allowedIds: ['x', 'y'],
    });

    expect(matches.map((match) => match.entityId)).toEqual(['a', 'b']);
    expect(matches[0].score).toBeGreaterThan(matches[1].score);

    const values = (prisma.$queryRaw as jest.Mock).mock.calls[0].slice(1);
    expect(values).toContain('product');
    expect(values).toContain(5);
    expect(values).toContainEqual(['x', 'y']);
  });
});
