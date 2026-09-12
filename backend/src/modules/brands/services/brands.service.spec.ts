import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { BrandsService } from './brands.service.js';
import { PrismaService } from '@/db/prisma.service.js';

describe('BrandsService', () => {
  let service: BrandsService;
  let prisma: {
    brand: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    userCompany: {
      findUnique: jest.Mock;
    };
  };

  const companyId = 'comp1';
  const userId = 'user1';

  beforeEach(async () => {
    prisma = {
      brand: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      userCompany: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(BrandsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a brand with slug', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.brand.findUnique.mockResolvedValue(null);
      prisma.brand.create.mockResolvedValue({
        id: 'b1',
        companyId,
        name: 'Minha Marca',
        slug: 'minha-marca',
        logoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(companyId, userId, {
        name: 'Minha Marca',
      });

      expect(result.id).toBe('b1');
      expect(result.name).toBe('Minha Marca');
      expect(result.slug).toBe('minha-marca');
      expect(prisma.brand.create).toHaveBeenCalledWith({
        data: {
          companyId,
          name: 'Minha Marca',
          slug: 'minha-marca',
          logoUrl: undefined,
        },
      });
    });

    it('should reject duplicate slug per company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.brand.findUnique.mockResolvedValue({
        id: 'existing',
        slug: 'minha-marca',
      });

      await expect(
        service.create(companyId, userId, {
          name: 'Outra',
          slug: 'minha-marca',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject if user not in company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue(null);

      await expect(
        service.create(companyId, userId, { name: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listByCompany', () => {
    it('should return brands for company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.brand.findMany.mockResolvedValue([
        {
          id: 'b1',
          companyId,
          name: 'Marca 1',
          slug: 'marca-1',
          logoUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.listByCompany(companyId, userId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Marca 1');
      expect(prisma.brand.findMany).toHaveBeenCalledWith({
        where: { companyId },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('findById', () => {
    it('should return a brand', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.brand.findFirst.mockResolvedValue({
        id: 'b1',
        companyId,
        name: 'Marca 1',
        slug: 'marca-1',
        logoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.findById(companyId, 'b1', userId);

      expect(result.id).toBe('b1');
      expect(result.name).toBe('Marca 1');
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.brand.findFirst.mockResolvedValue(null);

      await expect(
        service.findById(companyId, 'nonexistent', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a brand', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.brand.findFirst
        .mockResolvedValueOnce({
          id: 'b1',
          companyId,
          name: 'Marca 1',
          slug: 'marca-1',
        })
        .mockResolvedValueOnce(null);
      prisma.brand.update.mockResolvedValue({});
      prisma.brand.findUnique.mockResolvedValue({
        id: 'b1',
        companyId,
        name: 'Marca Atualizada',
        slug: 'marca-atualizada',
        logoUrl: 'https://example.com/logo.png',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.update(companyId, 'b1', userId, {
        name: 'Marca Atualizada',
        logoUrl: 'https://example.com/logo.png',
      });

      expect(result.name).toBe('Marca Atualizada');
      expect(result.logoUrl).toBe('https://example.com/logo.png');
    });

    it('should throw NotFoundException when brand not found', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.brand.findFirst.mockResolvedValue(null);

      await expect(
        service.update(companyId, 'nonexistent', userId, { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cross-company', () => {
    it('should reject access from another company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue(null);

      await expect(
        service.create('other-company', userId, { name: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
