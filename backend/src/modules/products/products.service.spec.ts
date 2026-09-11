import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { PrismaService } from '../../db/prisma.service.js';
import { SearchIndexQueue } from '../search/search-index-queue.js';
import { PlanAccessService } from '../plans/plan-access.service.js';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    product: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    brand: {
      findUnique: jest.Mock;
    };
    category: {
      findMany: jest.Mock;
    };
    productCategory: {
      findUnique: jest.Mock;
      createMany: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
    };
  };

  const companyId = 'comp1';

  const mockSearchIndexQueue = {
    indexProduct: jest.fn().mockResolvedValue(undefined),
    indexStore: jest.fn().mockResolvedValue(undefined),
    removeProduct: jest.fn().mockResolvedValue(undefined),
    removeStore: jest.fn().mockResolvedValue(undefined),
    reindexAllProducts: jest.fn().mockResolvedValue('job-1'),
    reindexAllStores: jest.fn().mockResolvedValue('job-1'),
  };

  const mockPlanAccess = {
    assertWithinLimit: jest.fn().mockResolvedValue(undefined),
    checkLimit: jest.fn(),
    can: jest.fn(),
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      brand: {
        findUnique: jest.fn(),
      },
      category: {
        findMany: jest.fn(),
      },
      productCategory: {
        findUnique: jest.fn(),
        createMany: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
    };

    mockPlanAccess.assertWithinLimit.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SearchIndexQueue, useValue: mockSearchIndexQueue },
        { provide: PlanAccessService, useValue: mockPlanAccess },
      ],
    }).compile();

    service = module.get(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should reject when the plan product limit is reached', async () => {
      mockPlanAccess.assertWithinLimit.mockRejectedValueOnce(
        new ForbiddenException({ message: 'Plan limit reached', feature: 'MAX_PRODUCTS' }),
      );

      await expect(service.create(companyId, { name: 'Camiseta' })).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockPlanAccess.assertWithinLimit).toHaveBeenCalledWith(companyId, 'MAX_PRODUCTS');
    });

    it('should create a product with slug', async () => {
      prisma.brand.findUnique.mockResolvedValue(null);
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue({
        id: 'p1',
        companyId,
        name: 'Camiseta',
        slug: 'camiseta',
        description: null,
        sku: null,
        barcode: null,
        imageUrl: null,
        brandId: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(companyId, { name: 'Camiseta' });

      expect(result.id).toBe('p1');
      expect(result.name).toBe('Camiseta');
      expect(result.slug).toBe('camiseta');
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId,
          name: 'Camiseta',
          slug: 'camiseta',
          status: 'ACTIVE',
        }),
      });
    });

    it('should create product with brand', async () => {
      prisma.brand.findUnique.mockResolvedValue({
        id: 'b1',
        companyId,
      });
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue({
        id: 'p1',
        companyId,
        name: 'Camiseta',
        slug: 'camiseta',
        description: null,
        sku: null,
        barcode: null,
        imageUrl: null,
        brandId: 'b1',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(companyId, {
        name: 'Camiseta',
        brandId: 'b1',
      });

      expect(result.brandId).toBe('b1');
    });
  });

  describe('findById', () => {
    it('should return a product', async () => {
      prisma.product.findFirst.mockResolvedValue({
        id: 'p1',
        companyId,
        name: 'Camiseta',
        slug: 'camiseta',
        description: null,
        sku: null,
        barcode: null,
        imageUrl: null,
        brandId: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.findById(companyId, 'p1');

      expect(result.id).toBe('p1');
      expect(result.name).toBe('Camiseta');
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.findById(companyId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listByCompany', () => {
    it('should return products for company', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'p1',
          companyId,
          name: 'Camiseta',
          slug: 'camiseta',
          description: null,
          sku: null,
          barcode: null,
          imageUrl: null,
          brandId: null,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.listByCompany(companyId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Camiseta');
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { companyId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      prisma.product.findFirst
        .mockResolvedValueOnce({
          id: 'p1',
          companyId,
          name: 'Camiseta',
          slug: 'camiseta',
          description: null,
          sku: null,
          barcode: null,
          imageUrl: null,
          brandId: null,
          status: 'ACTIVE',
        })
        .mockResolvedValueOnce(null);
      prisma.brand.findUnique.mockResolvedValue(null);
      prisma.product.update.mockResolvedValue({
        id: 'p1',
        companyId,
        name: 'Camiseta V2',
        slug: 'camiseta-v2',
        description: 'Atualizada',
        sku: 'CAM-002',
        barcode: null,
        imageUrl: null,
        brandId: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.update(companyId, 'p1', {
        name: 'Camiseta V2',
        description: 'Atualizada',
        sku: 'CAM-002',
      });

      expect(result.name).toBe('Camiseta V2');
      expect(result.sku).toBe('CAM-002');
    });

    it('should throw NotFoundException when product not found', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.update(companyId, 'nonexistent', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should soft delete a product', async () => {
      prisma.product.findFirst.mockResolvedValue({
        id: 'p1',
        companyId,
        name: 'Camiseta',
      });
      prisma.product.update.mockResolvedValue({});

      await service.deactivate(companyId, 'p1');

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: {
          status: 'INACTIVE',
          deletedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.deactivate(companyId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addCategories', () => {
    it('should associate categories', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', companyId });
      prisma.category.findMany.mockResolvedValue([
        { id: 'cat1' },
        { id: 'cat2' },
      ]);
      prisma.productCategory.createMany.mockResolvedValue({ count: 2 });

      await service.addCategories(companyId, 'p1', ['cat1', 'cat2']);

      expect(prisma.productCategory.createMany).toHaveBeenCalledWith({
        data: [
          { productId: 'p1', categoryId: 'cat1' },
          { productId: 'p1', categoryId: 'cat2' },
        ],
        skipDuplicates: true,
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.addCategories(companyId, 'nonexistent', ['cat1']),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when no category IDs', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', companyId });

      await expect(
        service.addCategories(companyId, 'p1', []),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when categories not found', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', companyId });
      prisma.category.findMany.mockResolvedValue([{ id: 'cat1' }]);

      await expect(
        service.addCategories(companyId, 'p1', ['cat1', 'cat2']),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeCategory', () => {
    it('should remove category association', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', companyId });
      prisma.productCategory.findUnique.mockResolvedValue({
        productId: 'p1',
        categoryId: 'cat1',
      });
      prisma.productCategory.delete.mockResolvedValue({});

      await service.removeCategory(companyId, 'p1', 'cat1');

      expect(prisma.productCategory.delete).toHaveBeenCalledWith({
        where: {
          productId_categoryId: { productId: 'p1', categoryId: 'cat1' },
        },
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.removeCategory(companyId, 'nonexistent', 'cat1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when association not found', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', companyId });
      prisma.productCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.removeCategory(companyId, 'p1', 'cat1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cross-company', () => {
    it('should reject access from another company', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.findById('other-company', 'p1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject brand from another company', async () => {
      prisma.brand.findUnique.mockResolvedValue({
        id: 'b1',
        companyId: 'other-company',
      });

      await expect(
        service.create(companyId, { name: 'X', brandId: 'b1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject brand not found', async () => {
      prisma.brand.findUnique.mockResolvedValue(null);

      await expect(
        service.create(companyId, { name: 'X', brandId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
