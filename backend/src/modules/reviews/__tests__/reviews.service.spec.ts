import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from '../reviews.service.js';
import { PrismaService } from '../../../db/prisma.service.js';
import { EventsService } from '../../events/events.service.js';
import { ReviewTargetType } from '../../../generated/prisma/enums.js';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: {
    review: { create: jest.Mock; findUnique: jest.Mock; findMany: jest.Mock; update: jest.Mock; delete: jest.Mock };
    product: { findUnique: jest.Mock };
    store: { findUnique: jest.Mock };
  };
  let eventsService: { track: jest.Mock };

  beforeEach(async () => {
    prisma = {
      review: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), delete: jest.fn() },
      product: { findUnique: jest.fn() },
      store: { findUnique: jest.fn() },
    };
    eventsService = { track: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsService, useValue: eventsService },
      ],
    }).compile();

    service = module.get(ReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create review for product', async () => {
      const product = { id: 'prod-1', status: 'ACTIVE', deletedAt: null };
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.review.findUnique.mockResolvedValue(null);

      const review = { id: 'rev-1', userId: 'user-1', targetType: 'PRODUCT', targetId: 'prod-1', rating: 5, title: 'Great', comment: 'Excellent', status: 'PENDING', createdAt: new Date(), updatedAt: new Date() };
      prisma.review.create.mockResolvedValue(review);
      eventsService.track.mockResolvedValue(undefined);

      const result = await service.create('user-1', {
        targetType: ReviewTargetType.PRODUCT,
        targetId: 'prod-1',
        rating: 5,
        title: 'Great',
        comment: 'Excellent',
      });

      expect(result.id).toBe('rev-1');
      expect(result.rating).toBe(5);
    });

    it('should throw ConflictException for duplicate review', async () => {
      const product = { id: 'prod-1', status: 'ACTIVE', deletedAt: null };
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.review.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create('user-1', {
        targetType: ReviewTargetType.PRODUCT,
        targetId: 'prod-1',
        rating: 5,
      })).rejects.toThrow('already reviewed');
    });

    it('should throw NotFoundException for inactive product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.create('user-1', {
        targetType: ReviewTargetType.PRODUCT,
        targetId: 'prod-1',
        rating: 5,
      })).rejects.toThrow('not found');
    });
  });

  describe('remove', () => {
    it('should remove own review', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 'rev-1', userId: 'user-1' });
      prisma.review.delete.mockResolvedValue(undefined);

      await service.remove('user-1', 'rev-1');
      expect(prisma.review.delete).toHaveBeenCalledWith({ where: { id: 'rev-1' } });
    });

    it('should throw ForbiddenException for other user review', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 'rev-1', userId: 'other-user' });

      await expect(service.remove('user-1', 'rev-1')).rejects.toThrow('Cannot delete');
    });
  });
});
