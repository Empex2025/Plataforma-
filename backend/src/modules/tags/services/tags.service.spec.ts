import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TagsService } from './tags.service.js';
import { PrismaService } from '@/db/prisma.service.js';

describe('TagsService', () => {
  let service: TagsService;
  let prisma: {
    tag: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
    };
  };

  const now = new Date();

  beforeEach(async () => {
    prisma = {
      tag: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TagsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(TagsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a tag', async () => {
      prisma.tag.findUnique.mockResolvedValue(null);
      prisma.tag.create.mockResolvedValue({
        id: 't1',
        name: 'Confortável',
        slug: 'confortavel',
        group: 'attribute',
        createdAt: now,
      });

      const result = await service.create({
        name: 'Confortável',
        slug: 'confortavel',
        group: 'attribute',
      });

      expect(result).toMatchObject({ id: 't1', slug: 'confortavel' });
    });

    it('should reject duplicate slug', async () => {
      prisma.tag.findUnique.mockResolvedValue({ id: 't1' });

      await expect(
        service.create({ name: 'Confortável', slug: 'confortavel' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findBySlug', () => {
    it('should return a tag', async () => {
      prisma.tag.findUnique.mockResolvedValue({
        id: 't1',
        name: 'Confortável',
        slug: 'confortavel',
        group: null,
        createdAt: now,
      });

      const result = await service.findBySlug('confortavel');
      expect(result.id).toBe('t1');
    });

    it('should throw when not found', async () => {
      prisma.tag.findUnique.mockResolvedValue(null);
      await expect(service.findBySlug('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('list', () => {
    it('should list tags', async () => {
      prisma.tag.findMany.mockResolvedValue([
        { id: 't1', name: 'A', slug: 'a', group: null, createdAt: now },
        { id: 't2', name: 'B', slug: 'b', group: null, createdAt: now },
      ]);

      const result = await service.list();
      expect(result).toHaveLength(2);
    });

    it('should filter by group', async () => {
      prisma.tag.findMany.mockResolvedValue([]);
      await service.list('style');
      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        where: { group: 'style' },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findOrCreate', () => {
    it('should return existing tag', async () => {
      prisma.tag.findUnique.mockResolvedValue({
        id: 't1',
        name: 'A',
        slug: 'a',
        group: null,
        createdAt: now,
      });

      const result = await service.findOrCreate('A', 'a');
      expect(result.id).toBe('t1');
      expect(prisma.tag.create).not.toHaveBeenCalled();
    });

    it('should create when missing', async () => {
      prisma.tag.findUnique.mockResolvedValue(null);
      prisma.tag.create.mockResolvedValue({
        id: 't2',
        name: 'B',
        slug: 'b',
        group: null,
        createdAt: now,
      });

      const result = await service.findOrCreate('B', 'b');
      expect(result.id).toBe('t2');
      expect(prisma.tag.create).toHaveBeenCalled();
    });
  });
});
