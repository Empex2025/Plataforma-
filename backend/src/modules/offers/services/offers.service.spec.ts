import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { OffersService } from './offers.service.js';
import { PrismaService } from '@/db/prisma.service.js';
import { SearchIndexQueue } from '@/modules/search/queues/search-index-queue.js';

describe('OffersService', () => {
  let service: OffersService;
  let prisma: {
    offer: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    store: { findUnique: jest.Mock };
    product: { findUnique: jest.Mock };
    offerProduct: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
    userCompany: { findUnique: jest.Mock };
  };
  let searchIndexQueue: { indexStore: jest.Mock; indexProduct: jest.Mock };

  const companyId = 'comp1';
  const userId = 'user1';

  beforeEach(async () => {
    prisma = {
      offer: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      store: { findUnique: jest.fn() },
      product: { findUnique: jest.fn() },
      offerProduct: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      userCompany: { findUnique: jest.fn() },
    };

    searchIndexQueue = {
      indexStore: jest.fn().mockResolvedValue(undefined),
      indexProduct: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffersService,
        { provide: PrismaService, useValue: prisma },
        { provide: SearchIndexQueue, useValue: searchIndexQueue },
      ],
    }).compile();

    service = module.get(OffersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an offer', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.offer.create.mockResolvedValue({
        id: 'o1',
        companyId,
        storeId: null,
        title: 'Black Friday',
        description: 'Ofertas',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        status: 'ACTIVE',
        startsAt: null,
        endsAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(companyId, userId, {
        title: 'Black Friday',
        description: 'Ofertas',
        discountType: 'PERCENTAGE' as any,
        discountValue: 10,
      });

      expect(result.id).toBe('o1');
      expect(result.title).toBe('Black Friday');
      expect(prisma.offer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId,
          title: 'Black Friday',
          discountType: 'PERCENTAGE',
          discountValue: 10,
        }),
      });
      expect(searchIndexQueue.indexStore).not.toHaveBeenCalled();
    });

    it('should create offer with store', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.store.findUnique.mockResolvedValue({ id: 'store1', companyId });
      prisma.offer.create.mockResolvedValue({
        id: 'o1',
        companyId,
        storeId: 'store1',
        title: 'Black Friday',
        description: null,
        discountType: 'PERCENTAGE',
        discountValue: 10,
        status: 'ACTIVE',
        startsAt: null,
        endsAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(companyId, userId, {
        title: 'Black Friday',
        discountType: 'PERCENTAGE' as any,
        discountValue: 10,
        storeId: 'store1',
      });

      expect(result.storeId).toBe('store1');
      expect(searchIndexQueue.indexStore).toHaveBeenCalledWith('store1');
    });

    it('should reject startsAt > endsAt', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });

      await expect(
        service.create(companyId, userId, {
          title: 'Bad Dates',
          discountType: 'PERCENTAGE' as any,
          discountValue: 10,
          startsAt: new Date('2026-12-31'),
          endsAt: new Date('2026-01-01'),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject store from another company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.store.findUnique.mockResolvedValue({
        id: 'store1',
        companyId: 'other',
      });

      await expect(
        service.create(companyId, userId, {
          title: 'X',
          discountType: 'PERCENTAGE' as any,
          discountValue: 10,
          storeId: 'store1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listByCompany', () => {
    it('should return offers for company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.offer.findMany.mockResolvedValue([
        {
          id: 'o1',
          companyId,
          storeId: null,
          title: 'Black Friday',
          description: null,
          discountType: 'PERCENTAGE',
          discountValue: 10,
          status: 'ACTIVE',
          startsAt: null,
          endsAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.listByCompany(companyId, userId);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Black Friday');
      expect(prisma.offer.findMany).toHaveBeenCalledWith({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findById', () => {
    it('should return an offer', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.offer.findUnique.mockResolvedValue({
        id: 'o1',
        companyId,
        storeId: null,
        title: 'Black Friday',
        description: null,
        discountType: 'PERCENTAGE',
        discountValue: 10,
        status: 'ACTIVE',
        startsAt: null,
        endsAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.findById(companyId, 'o1', userId);

      expect(result.id).toBe('o1');
      expect(result.title).toBe('Black Friday');
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.offer.findUnique.mockResolvedValue(null);

      await expect(
        service.findById(companyId, 'nonexistent', userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when offer belongs to another company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.offer.findUnique.mockResolvedValue({
        id: 'o1',
        companyId: 'other',
        title: 'X',
      });

      await expect(
        service.findById(companyId, 'o1', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an offer', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.offer.findUnique
        .mockResolvedValueOnce({
          id: 'o1',
          companyId,
          storeId: null,
          title: 'Old',
          description: null,
          discountType: 'PERCENTAGE',
          discountValue: 10,
          status: 'ACTIVE',
          startsAt: null,
          endsAt: null,
        })
        .mockResolvedValueOnce(null);
      prisma.offer.update.mockResolvedValue({
        id: 'o1',
        companyId,
        storeId: null,
        title: 'Updated',
        description: null,
        discountType: 'PERCENTAGE',
        discountValue: 15,
        status: 'ACTIVE',
        startsAt: null,
        endsAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.update(companyId, 'o1', userId, {
        title: 'Updated',
        discountValue: 15,
      });

      expect(result.title).toBe('Updated');
      expect(result.discountValue).toBe(15);
    });

    it('should throw NotFoundException when offer not found', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.offer.findUnique.mockResolvedValue(null);

      await expect(
        service.update(companyId, 'nonexistent', userId, { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addProduct', () => {
    it('should add product to offer', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.offer.findUnique.mockResolvedValue({ id: 'o1', companyId });
      prisma.product.findUnique.mockResolvedValue({ id: 'p1', companyId });
      prisma.offerProduct.create.mockResolvedValue({});

      await service.addProduct(companyId, userId, 'o1', { productId: 'p1' });

      expect(prisma.offerProduct.create).toHaveBeenCalledWith({
        data: { offerId: 'o1', productId: 'p1' },
      });
    });

    it('should handle P2002 duplicate', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.offer.findUnique.mockResolvedValue({ id: 'o1', companyId });
      prisma.product.findUnique.mockResolvedValue({ id: 'p1', companyId });
      prisma.offerProduct.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.addProduct(companyId, userId, 'o1', { productId: 'p1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject product from another company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.offer.findUnique.mockResolvedValue({ id: 'o1', companyId });
      prisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        companyId: 'other',
      });

      await expect(
        service.addProduct(companyId, userId, 'o1', { productId: 'p1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject offer from another company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.offer.findUnique.mockResolvedValue({ id: 'o1', companyId: 'other' });

      await expect(
        service.addProduct(companyId, userId, 'o1', { productId: 'p1' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeProduct', () => {
    it('should remove product from offer', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.offer.findUnique.mockResolvedValue({ id: 'o1', companyId });
      prisma.offerProduct.findUnique.mockResolvedValue({
        offerId: 'o1',
        productId: 'p1',
      });
      prisma.offerProduct.delete.mockResolvedValue({});

      await service.removeProduct(companyId, userId, 'o1', 'p1');

      expect(prisma.offerProduct.delete).toHaveBeenCalledWith({
        where: { offerId_productId: { offerId: 'o1', productId: 'p1' } },
      });
    });

    it('should throw NotFoundException when not in offer', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.offer.findUnique.mockResolvedValue({ id: 'o1', companyId });
      prisma.offerProduct.findUnique.mockResolvedValue(null);

      await expect(
        service.removeProduct(companyId, userId, 'o1', 'p1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listProducts', () => {
    it('should return products in offer', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.offer.findUnique.mockResolvedValue({ id: 'o1', companyId });
      prisma.offerProduct.findMany.mockResolvedValue([
        {
          id: 'op1',
          offerId: 'o1',
          productId: 'p1',
          product: { id: 'p1', name: 'Product 1' },
          createdAt: new Date(),
        },
      ]);

      const result = await service.listProducts(companyId, 'o1', userId);

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('p1');
      expect(result[0].product.name).toBe('Product 1');
    });

    it('should throw ForbiddenException when offer not in company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.offer.findUnique.mockResolvedValue({ id: 'o1', companyId: 'other' });

      await expect(
        service.listProducts(companyId, 'o1', userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cross-company', () => {
    it('should reject if user not in company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue(null);

      await expect(
        service.create(companyId, userId, {
          title: 'X',
          discountType: 'PERCENTAGE' as any,
          discountValue: 10,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject productId from another company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.offer.findUnique.mockResolvedValue({ id: 'o1', companyId });
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addProduct(companyId, userId, 'o1', { productId: 'p1' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('invalid dates', () => {
    it('should reject startsAt > endsAt on create', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });

      await expect(
        service.create(companyId, userId, {
          title: 'Bad Dates',
          discountType: 'PERCENTAGE' as any,
          discountValue: 10,
          startsAt: new Date('2026-12-31'),
          endsAt: new Date('2026-01-01'),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject startsAt > endsAt on update', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId, companyId });
      prisma.offer.findUnique.mockResolvedValue({
        id: 'o1',
        companyId,
        startsAt: null,
        endsAt: null,
      });

      await expect(
        service.update(companyId, 'o1', userId, {
          startsAt: new Date('2026-12-31'),
          endsAt: new Date('2026-01-01'),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
