import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service.js';
import { PrismaService } from '@/db/prisma.service.js';
import { EventsService } from '@/modules/events/events.service.js';
import { ReviewTargetType } from '@/generated/prisma/enums.js';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: {
    review: { create: jest.Mock; findUnique: jest.Mock; findMany: jest.Mock; update: jest.Mock; delete: jest.Mock; count: jest.Mock; groupBy: jest.Mock };
    product: { findUnique: jest.Mock; update: jest.Mock };
    store: { findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let eventsService: { track: jest.Mock };

  beforeEach(async () => {
    prisma = {
      review: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
      product: { findUnique: jest.fn(), update: jest.fn() },
      store: { findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)),
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
      })).rejects.toThrow('já avaliou');
    });

    it('should throw NotFoundException for inactive product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.create('user-1', {
        targetType: ReviewTargetType.PRODUCT,
        targetId: 'prod-1',
        rating: 5,
      })).rejects.toThrow('não encontrad');
    });
  });

  describe('remove', () => {
    it('should remove own review', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 'rev-1', userId: 'user-1', status: 'PENDING', targetType: 'PRODUCT', targetId: 'prod-1' });
      prisma.review.delete.mockResolvedValue(undefined);
      prisma.review.groupBy.mockResolvedValue([]);

      await service.remove('user-1', 'rev-1');
      expect(prisma.review.delete).toHaveBeenCalledWith({ where: { id: 'rev-1' } });
    });

    it('should recompute rating when removing APPROVED review', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 'rev-1', userId: 'user-1', status: 'APPROVED', targetType: 'PRODUCT', targetId: 'prod-1' });
      prisma.review.delete.mockResolvedValue(undefined);
      prisma.review.groupBy.mockResolvedValue([{ _count: { id: 1 }, _avg: { rating: 4 } }]);
      prisma.product.update.mockResolvedValue({});

      await service.remove('user-1', 'rev-1');
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { ratingAverage: 4, ratingCount: 1 },
      });
    });

    it('should throw ForbiddenException for other user review', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 'rev-1', userId: 'other-user' });

      await expect(service.remove('user-1', 'rev-1')).rejects.toThrow('Não é possível remover');
    });
  });

  describe('moderate', () => {
    it('should approve a pending review and recompute rating', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 'rev-1', userId: 'user-1', status: 'PENDING', targetType: 'PRODUCT', targetId: 'prod-1' });
      prisma.review.update.mockResolvedValue({ id: 'rev-1', status: 'APPROVED', moderatedById: 'admin-1', moderatedAt: new Date() });
      prisma.review.groupBy.mockResolvedValue([{ _count: { id: 2 }, _avg: { rating: 4.5 } }]);
      prisma.product.update.mockResolvedValue({});
      eventsService.track.mockResolvedValue(undefined);

      const result = await service.moderate('rev-1', 'admin-1', 'APPROVED', 'Good review');
      expect(result.status).toBe('APPROVED');
      expect(prisma.product.update).toHaveBeenCalled();
      expect(eventsService.track).toHaveBeenCalled();
    });

    it('should reject a pending review', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 'rev-1', userId: 'user-1', status: 'PENDING', targetType: 'STORE', targetId: 'store-1' });
      prisma.review.update.mockResolvedValue({ id: 'rev-1', status: 'REJECTED' });
      prisma.review.groupBy.mockResolvedValue([]);
      prisma.store.update.mockResolvedValue({});
      eventsService.track.mockResolvedValue(undefined);

      const result = await service.moderate('rev-1', 'admin-1', 'REJECTED', 'Spam');
      expect(result.status).toBe('REJECTED');
    });

    it('should throw NotFoundException when review not found', async () => {
      prisma.review.findUnique.mockResolvedValue(null);
      await expect(service.moderate('rev-1', 'admin-1', 'APPROVED')).rejects.toThrow('não encontrad');
    });

    it('should throw BadRequestException when review is not PENDING', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 'rev-1', userId: 'user-1', status: 'APPROVED' });
      await expect(service.moderate('rev-1', 'admin-1', 'APPROVED')).rejects.toThrow('Não é possível moderar');
    });

    it('should throw ForbiddenException when moderating own review', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 'rev-1', userId: 'admin-1', status: 'PENDING' });
      await expect(service.moderate('rev-1', 'admin-1', 'APPROVED')).rejects.toThrow('Não é possível moderar a própria');
    });
  });

  describe('listForModeration', () => {
    it('should return paginated pending reviews', async () => {
      prisma.review.findMany.mockResolvedValue([{ id: 'rev-1', status: 'PENDING', user: { id: 'u1', name: 'A', email: 'a@b.com' } }]);
      prisma.review.count.mockResolvedValue(1);

      const result = await service.listForModeration('PENDING', 1, 20);
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });
  });
});
