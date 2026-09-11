import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service.js';
import { EventsService } from '../events/events.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { ReviewResponseDto } from './dto/review-response.dto.js';
import { ReviewTargetType, EventType } from '../../generated/prisma/enums.js';

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

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.comment !== undefined && { comment: dto.comment }),
        status: 'PENDING',
      },
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

    await this.prisma.review.delete({ where: { id: reviewId } });
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
