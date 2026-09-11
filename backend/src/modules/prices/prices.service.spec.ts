import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PricesService } from './prices.service.js';
import { PrismaService } from '../../db/prisma.service.js';
import { SearchIndexQueue } from '../search/search-index-queue.js';

describe('PricesService', () => {
  let service: PricesService;
  let prisma: {
    store: { findUnique: jest.Mock };
    product: { findUnique: jest.Mock };
    price: { findMany: jest.Mock; findUnique: jest.Mock };
    userCompany: { findUnique: jest.Mock };
    $transaction: jest.Mock;
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
      price: { findMany: jest.fn(), findUnique: jest.fn() },
      userCompany: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricesService,
        { provide: PrismaService, useValue: prisma },
        { provide: SearchIndexQueue, useValue: mockSearchIndexQueue },
      ],
    }).compile();

    service = module.get(PricesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a price with transaction', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.store.findUnique.mockResolvedValue({ id: storeId, companyId });
      prisma.product.findUnique.mockResolvedValue({ id: productId, companyId });

      const mockTx = {
        price: {
          updateMany: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue({
            id: 'price1',
            storeId,
            productId,
            type: 'REGULAR',
            value: 29.9,
            validFrom: new Date(),
            validTo: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: Function) => fn(mockTx));

      const result = await service.create(companyId, userId, {
        storeId,
        productId,
        value: 29.9,
      });

      expect(result.id).toBe('price1');
      expect(result.value).toBe(29.9);
      expect(mockTx.price.updateMany).toHaveBeenCalled();
      expect(mockTx.price.create).toHaveBeenCalled();
    });

    it('should close previous active price', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.store.findUnique.mockResolvedValue({ id: storeId, companyId });
      prisma.product.findUnique.mockResolvedValue({ id: productId, companyId });

      const mockTx = {
        price: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn().mockResolvedValue({
            id: 'price2',
            storeId,
            productId,
            type: 'REGULAR',
            value: 39.9,
            validFrom: new Date(),
            validTo: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: Function) => fn(mockTx));

      await service.create(companyId, userId, {
        storeId,
        productId,
        value: 39.9,
      });

      expect(mockTx.price.updateMany).toHaveBeenCalledWith({
        where: {
          storeId,
          productId,
          type: 'REGULAR',
          validTo: null,
        },
        data: { validTo: expect.any(Date) },
      });
    });

    it('should handle P2002 conflict', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.store.findUnique.mockResolvedValue({ id: storeId, companyId });
      prisma.product.findUnique.mockResolvedValue({ id: productId, companyId });

      prisma.$transaction.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.create(companyId, userId, {
          storeId,
          productId,
          value: 29.9,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject price with store from another company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.store.findUnique.mockResolvedValue({
        id: storeId,
        companyId: 'other-company',
      });

      await expect(
        service.create(companyId, userId, {
          storeId,
          productId,
          value: 29.9,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject price with product from another company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.store.findUnique.mockResolvedValue({ id: storeId, companyId });
      prisma.product.findUnique.mockResolvedValue({
        id: productId,
        companyId: 'other-company',
      });

      await expect(
        service.create(companyId, userId, {
          storeId,
          productId,
          value: 29.9,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject validTo < validFrom', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.store.findUnique.mockResolvedValue({ id: storeId, companyId });
      prisma.product.findUnique.mockResolvedValue({ id: productId, companyId });

      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);

      await expect(
        service.create(companyId, userId, {
          storeId,
          productId,
          value: 29.9,
          validFrom: now.toISOString(),
          validTo: yesterday.toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('list', () => {
    it('should return prices with filters', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.price.findMany.mockResolvedValue([
        {
          id: 'price1',
          storeId,
          productId,
          type: 'REGULAR',
          value: 29.9,
          validFrom: new Date(),
          validTo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.list(companyId, userId, {
        storeId,
        productId,
      });

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(29.9);
      expect(prisma.price.findMany).toHaveBeenCalledWith({
        where: {
          store: { companyId },
          storeId,
          productId,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findById', () => {
    it('should return a price', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.price.findUnique.mockResolvedValue({
        id: 'price1',
        storeId,
        productId,
        type: 'REGULAR',
        value: 29.9,
        validFrom: new Date(),
        validTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        store: { companyId },
      });

      const result = await service.findById(companyId, userId, 'price1');

      expect(result.id).toBe('price1');
      expect(result.value).toBe(29.9);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.price.findUnique.mockResolvedValue(null);

      await expect(
        service.findById(companyId, userId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when price belongs to another company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.price.findUnique.mockResolvedValue({
        id: 'price1',
        store: { companyId: 'other-company' },
      });

      await expect(
        service.findById(companyId, userId, 'price1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cross-company', () => {
    it('should reject if user not in company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue(null);

      await expect(
        service.create(companyId, userId, {
          storeId,
          productId,
          value: 29.9,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
