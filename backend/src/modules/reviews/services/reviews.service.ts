import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { EventsService } from '@/modules/events/events.service.js';
import { CreateReviewDto } from '../dto/create-review.dto.js';
import { UpdateReviewDto } from '../dto/update-review.dto.js';
import { ReviewResponseDto } from '../dto/review-response.dto.js';
import { ReviewTargetType, EventType } from '@/generated/prisma/enums.js';
import type { Prisma } from '@/generated/prisma/client.js';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  async create(userId: string, dto: CreateReviewDto): Promise<ReviewResponseDto> {
    await this.validateTargetExists(dto.targetType, dto.targetId);

    const existing = await this.prisma.review.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: dto.targetType,
          targetId: dto.targetId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('You have already reviewed this item');
    }

    const review = await this.prisma.review.create({
      data: {
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        rating: dto.rating,
        title: dto.title ?? null,
        comment: dto.comment ?? null,
        status: 'PENDING',
      },
    });

    this.eventsService.track(
      { type: EventType.REVIEW_CREATED, targetType: dto.targetType, targetId: dto.targetId },
      userId,
    ).catch((err) => this.logger.warn(`Failed to track review event: ${err}`));

    return ReviewResponseDto.fromPlain(review as unknown as Record<string, unknown>);
  }

  async update(userId: string, reviewId: string, dto: UpdateReviewDto): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('Cannot update another user\'s review');
    }

    const wasApproved = review.status === 'APPROVED';

    const updated = await this.prisma.$transaction(async (tx) => {
      const r = await tx.review.update({
        where: { id: reviewId },
        data: {
          ...(dto.rating !== undefined && { rating: dto.rating }),
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.comment !== undefined && { comment: dto.comment }),
          status: 'PENDING',
        },
      });

      if (wasApproved) {
        await this.recomputeTargetRating(tx, review.targetType, review.targetId);
      }

      return r;
    });

    return ReviewResponseDto.fromPlain(updated as unknown as Record<string, unknown>);
  }

  async remove(userId: string, reviewId: string): Promise<void> {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('Cannot delete another user\'s review');
    }

    const wasApproved = review.status === 'APPROVED';

    await this.prisma.$transaction(async (tx) => {
      await tx.review.delete({ where: { id: reviewId } });

      if (wasApproved) {
        await this.recomputeTargetRating(tx, review.targetType, review.targetId);
      }
    });
  }

  async findMine(userId: string): Promise<ReviewResponseDto[]> {
    const reviews = await this.prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((r) => ReviewResponseDto.fromPlain(r as unknown as Record<string, unknown>));
  }

  async findByTarget(targetType: ReviewTargetType, targetId: string, page = 1, limit = 20): Promise<ReviewResponseDto[]> {
    const offset = (page - 1) * limit;

    const reviews = await this.prisma.review.findMany({
      where: {
        targetType,
        targetId,
        status: 'APPROVED',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return reviews.map((r) => ReviewResponseDto.fromPlain(r as unknown as Record<string, unknown>));
  }

  async listForModeration(
    status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING',
    page = 1,
    limit = 20,
  ): Promise<{ data: ReviewResponseDto[]; total: number }> {
    const offset = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { status },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.review.count({ where: { status } }),
    ]);

    return {
      data: reviews.map((r) => ReviewResponseDto.fromPlain(r as unknown as Record<string, unknown>)),
      total,
    };
  }

  async moderate(
    reviewId: string,
    moderatorId: string,
    decision: 'APPROVED' | 'REJECTED',
    note?: string,
  ): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.status !== 'PENDING') {
      throw new BadRequestException(`Cannot moderate review with status: ${review.status}`);
    }

    if (review.userId === moderatorId) {
      throw new ForbiddenException('Cannot moderate your own review');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const r = await tx.review.update({
        where: { id: reviewId },
        data: {
          status: decision,
          moderatedById: moderatorId,
          moderatedAt: new Date(),
          moderationNote: note ?? null,
        },
      });

      await this.recomputeTargetRating(tx, review.targetType, review.targetId);

      return r;
    });

    const eventType = decision === 'APPROVED' ? EventType.REVIEW_APPROVED : EventType.REVIEW_REJECTED;
    this.eventsService.track(
      { type: eventType, targetType: review.targetType, targetId: review.targetId },
      moderatorId,
    ).catch((err) => this.logger.warn(`Failed to track moderation event: ${err}`));

    return ReviewResponseDto.fromPlain(updated as unknown as Record<string, unknown>);
  }

  private async recomputeTargetRating(
    tx: Prisma.TransactionClient,
    targetType: ReviewTargetType,
    targetId: string,
  ): Promise<void> {
    const agg = await tx.review.groupBy({
      by: ['targetType'],
      where: { targetType, targetId, status: 'APPROVED' },
      _avg: { rating: true },
      _count: { id: true },
    });

    const ratingCount = agg.length > 0 ? agg[0]._count.id : 0;
    const ratingAverage = agg.length > 0 ? agg[0]._avg.rating : null;

    if (targetType === 'STORE') {
      await tx.store.update({
        where: { id: targetId },
        data: { ratingAverage, ratingCount },
      });
    } else if (targetType === 'PRODUCT') {
      await tx.product.update({
        where: { id: targetId },
        data: { ratingAverage, ratingCount },
      });
    }
  }

  private async validateTargetExists(targetType: ReviewTargetType, targetId: string): Promise<void> {
    if (targetType === ReviewTargetType.PRODUCT) {
      const product = await this.prisma.product.findUnique({ where: { id: targetId } });
      if (!product || product.status !== 'ACTIVE' || product.deletedAt) {
        throw new NotFoundException('Product not found or inactive');
      }
    } else if (targetType === ReviewTargetType.STORE) {
      const store = await this.prisma.store.findUnique({ where: { id: targetId } });
      if (!store || store.status !== 'ACTIVE' || store.deletedAt) {
        throw new NotFoundException('Store not found or inactive');
      }
    }
  }
}
