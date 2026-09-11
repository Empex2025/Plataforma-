import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { PrismaService } from '../../db/prisma.service.js';
import { SearchIndexQueue } from '../search/search-index-queue.js';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: {
    store: { findUnique: jest.Mock };
    product: { findUnique: jest.Mock };
    inventory: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
    userCompany: { findUnique: jest.Mock };
  };

  const companyId = 'comp1';
  const userId = 'user1';
  const storeId = 'store1';
  const productId = 'prod1';

  const mockSearchIndexQueue = {
    indexProduct: jest.fn().mockResolvedValue(undefined),
    indexStore: jest.fn().mockResolvedValue(undefined),
    removeProduct: jest.fn().mockResolvedValue(undefined),
    removeStore: jest.fn().mockResolvedValue(undefined),
    reindexAllProducts: jest.fn().mockResolvedValue('job-1'),
    reindexAllStores: jest.fn().mockResolvedValue('job-1'),
  };

  beforeEach(async () => {
    prisma = {
      store: { findUnique: jest.fn() },
      product: { findUnique: jest.fn() },
      inventory: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      userCompany: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: SearchIndexQueue, useValue: mockSearchIndexQueue },
      ],
    }).compile();

    service = module.get(InventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upsert', () => {
    it('should create an inventory record', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.store.findUnique.mockResolvedValue({ id: storeId, companyId });
      prisma.product.findUnique.mockResolvedValue({ id: productId, companyId });
      prisma.inventory.upsert.mockResolvedValue({
        id: 'inv1',
        storeId,
        productId,
        quantity: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.upsert(companyId, userId, {
        storeId,
        productId,
        quantity: 100,
      });

      expect(result.id).toBe('inv1');
      expect(result.quantity).toBe(100);
      expect(prisma.inventory.upsert).toHaveBeenCalledWith({
        where: { storeId_productId: { storeId, productId } },
        update: { quantity: 100 },
        create: { storeId, productId, quantity: 100 },
      });
    });

    it('should update quantity if exists', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.store.findUnique.mockResolvedValue({ id: storeId, companyId });
      prisma.product.findUnique.mockResolvedValue({ id: productId, companyId });
      prisma.inventory.upsert.mockResolvedValue({
        id: 'inv1',
        storeId,
        productId,
        quantity: 200,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.upsert(companyId, userId, {
        storeId,
        productId,
        quantity: 200,
      });

      expect(result.quantity).toBe(200);
    });

    it('should reject negative quantity', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.store.findUnique.mockResolvedValue({ id: storeId, companyId });
      prisma.product.findUnique.mockResolvedValue({ id: productId, companyId });

      await expect(
        service.upsert(companyId, userId, {
          storeId,
          productId,
          quantity: -1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject store from another company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.store.findUnique.mockResolvedValue({
        id: storeId,
        companyId: 'other-company',
      });

      await expect(
        service.upsert(companyId, userId, {
          storeId,
          productId,
          quantity: 10,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject product from another company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.store.findUnique.mockResolvedValue({ id: storeId, companyId });
      prisma.product.findUnique.mockResolvedValue({
        id: productId,
        companyId: 'other-company',
      });

      await expect(
        service.upsert(companyId, userId, {
          storeId,
          productId,
          quantity: 10,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByStoreAndProduct', () => {
    it('should return inventory', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.store.findUnique.mockResolvedValue({ id: storeId, companyId });
      prisma.product.findUnique.mockResolvedValue({ id: productId, companyId });
      prisma.inventory.findUnique.mockResolvedValue({
        id: 'inv1',
        storeId,
        productId,
        quantity: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.findByStoreAndProduct(
        companyId,
        userId,
        productId,
        storeId,
      );

      expect(result.id).toBe('inv1');
      expect(result.quantity).toBe(100);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.store.findUnique.mockResolvedValue({ id: storeId, companyId });
      prisma.product.findUnique.mockResolvedValue({ id: productId, companyId });
      prisma.inventory.findUnique.mockResolvedValue(null);

      await expect(
        service.findByStoreAndProduct(companyId, userId, productId, storeId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listByCompany', () => {
    it('should return inventory with filters', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.store.findUnique.mockResolvedValue({ id: storeId, companyId });
      prisma.inventory.findMany.mockResolvedValue([
        {
          id: 'inv1',
          storeId,
          productId,
          quantity: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.listByCompany(companyId, userId, {
        storeId,
      });

      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(100);
      expect(prisma.inventory.findMany).toHaveBeenCalledWith({
        where: { storeId },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('cross-company', () => {
    it('should reject if user not in company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue(null);

      await expect(
        service.upsert(companyId, userId, {
          storeId,
          productId,
          quantity: 10,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject store from another company in listByCompany', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.store.findUnique.mockResolvedValue({
        id: storeId,
        companyId: 'other-company',
      });

      await expect(
        service.listByCompany(companyId, userId, { storeId }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
