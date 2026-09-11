import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { PrismaService } from '../../db/prisma.service.js';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    category: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      category: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a category with slug', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue({
        id: 'c1',
        name: 'Eletrônicos',
        slug: 'eletronicos',
        icon: 'laptop',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create({
        name: 'Eletrônicos',
        icon: 'laptop',
      });

      expect(result.id).toBe('c1');
      expect(result.name).toBe('Eletrônicos');
      expect(result.slug).toBe('eletronicos');
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          name: 'Eletrônicos',
          slug: 'eletronicos',
          icon: 'laptop',
          parentId: undefined,
        },
      });
    });

    it('should create a subcategory with parentId', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce({ id: 'parent1', name: 'Parent' })
        .mockResolvedValueOnce(null);
      prisma.category.create.mockResolvedValue({
        id: 'c2',
        name: 'Smartphones',
        slug: 'smartphones',
        icon: null,
        parentId: 'parent1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create({
        name: 'Smartphones',
        parentId: 'parent1',
      });

      expect(result.parentId).toBe('parent1');
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ parentId: 'parent1' }),
      });
    });

    it('should reject duplicate slug', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'existing',
        slug: 'eletronicos',
      });

      await expect(
        service.create({ name: 'Outro', slug: 'eletronicos' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject invalid parentId', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ name: 'Test', parentId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return root categories', async () => {
      prisma.category.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Eletrônicos',
          slug: 'eletronicos',
          icon: 'laptop',
          parentId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          children: [],
        },
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Eletrônicos');
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { parentId: null },
        orderBy: { name: 'asc' },
        include: { children: { orderBy: { name: 'asc' } } },
      });
    });
  });

  describe('findById', () => {
    it('should return a category', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'c1',
        name: 'Eletrônicos',
        slug: 'eletronicos',
        icon: 'laptop',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.findById('c1');

      expect(result.id).toBe('c1');
      expect(result.name).toBe('Eletrônicos');
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findChildren', () => {
    it('should return subcategories', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'parent1',
        name: 'Parent',
      });
      prisma.category.findMany.mockResolvedValue([
        {
          id: 'c2',
          name: 'Smartphones',
          slug: 'smartphones',
          icon: null,
          parentId: 'parent1',
          createdAt: new Date(),
          updatedAt: new Date(),
          children: [],
        },
      ]);

      const result = await service.findChildren('parent1');

      expect(result).toHaveLength(1);
      expect(result[0].parentId).toBe('parent1');
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { parentId: 'parent1' },
        orderBy: { name: 'asc' },
        include: { children: { orderBy: { name: 'asc' } } },
      });
    });

    it('should throw NotFoundException when parent not found', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findChildren('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce({
          id: 'c1',
          name: 'Eletrônicos',
          slug: 'eletronicos',
        })
        .mockResolvedValueOnce(null);
      prisma.category.update.mockResolvedValue({
        id: 'c1',
        name: 'Eletrônicos Atualizados',
        slug: 'eletronicos-atualizados',
        icon: 'laptop',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.update('c1', {
        name: 'Eletrônicos Atualizados',
      });

      expect(result.name).toBe('Eletrônicos Atualizados');
    });

    it('should throw NotFoundException when category not found', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
