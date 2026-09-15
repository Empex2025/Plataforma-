import { jest } from '@jest/globals';
import { ArrayVectorStore } from './array-vector-store.js';

function makePrisma() {
  return {
    embedding: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
  };
}

const record = {
  entityType: 'product' as const,
  entityId: '11111111-1111-1111-1111-111111111111',
  model: 'local-deterministic',
  version: 'v1',
  dimension: 3,
  contentHash: 'hash',
  vector: [1, 0, 0],
};

describe('ArrayVectorStore', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let store: ArrayVectorStore;

  beforeEach(() => {
    prisma = makePrisma();
    store = new ArrayVectorStore(prisma as never);
  });

  it('is always available', async () => {
    await expect(store.isAvailable()).resolves.toBe(true);
  });

  it('upserts with the composite unique key', async () => {
    prisma.embedding.upsert.mockResolvedValue(undefined);

    await store.upsert(record);

    expect(prisma.embedding.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          entityType_entityId_model_version: {
            entityType: record.entityType,
            entityId: record.entityId,
            model: record.model,
            version: record.version,
          },
        },
      }),
    );
  });

  it('maps a stored row into a record', async () => {
    prisma.embedding.findUnique.mockResolvedValue(record);

    const result = await store.get(record.entityType, record.entityId, record.model, record.version);

    expect(result).toEqual(record);
  });

  it('returns null when no embedding exists', async () => {
    prisma.embedding.findUnique.mockResolvedValue(null);
    await expect(store.get('product', 'id', 'm', 'v1')).resolves.toBeNull();
  });

  it('deletes all embeddings of an entity', async () => {
    prisma.embedding.deleteMany.mockResolvedValue({ count: 1 });

    await store.delete('product', record.entityId);

    expect(prisma.embedding.deleteMany).toHaveBeenCalledWith({
      where: { entityType: 'product', entityId: record.entityId },
    });
  });

  it('ranks matches by cosine similarity', async () => {
    prisma.embedding.findMany.mockResolvedValue([
      { entityId: 'orthogonal', vector: [0, 1, 0] },
      { entityId: 'identical', vector: [1, 0, 0] },
    ]);

    const matches = await store.findSimilar('product', [1, 0, 0], { limit: 10 });

    expect(matches[0].entityId).toBe('identical');
    expect(matches[0].score).toBeCloseTo(1, 6);
    expect(matches[1].entityId).toBe('orthogonal');
    expect(matches[1].score).toBe(0);
  });

  it('restricts the scan to allowed ids and honors the limit', async () => {
    prisma.embedding.findMany.mockResolvedValue([
      { entityId: 'a', vector: [1, 0] },
      { entityId: 'b', vector: [0.9, 0.1] },
    ]);

    const matches = await store.findSimilar('product', [1, 0], {
      limit: 1,
      allowedIds: ['a', 'b'],
    });

    expect(prisma.embedding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entityType: 'product', entityId: { in: ['a', 'b'] } },
      }),
    );
    expect(matches).toHaveLength(1);
  });
});
