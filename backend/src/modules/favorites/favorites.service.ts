import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service.js';
import { EventsService } from '../events/events.service.js';
import { CreateFavoriteDto } from './dto/create-favorite.dto.js';
import { FavoriteResponseDto } from './dto/favorite-response.dto.js';
import { FavoriteTargetType, EventType } from '../../generated/prisma/enums.js';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  async create(userId: string, dto: CreateFavoriteDto): Promise<FavoriteResponseDto> {
    await this.validateTargetExists(dto.targetType, dto.targetId);

    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: dto.targetType,
          targetId: dto.targetId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Favorite already exists');
    }

    const favorite = await this.prisma.favorite.create({
      data: {
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
      },
    });

    const eventType = dto.targetType === FavoriteTargetType.PRODUCT
      ? EventType.PRODUCT_FAVORITE
      : EventType.STORE_FAVORITE;

    this.eventsService.track(
      { type: eventType, targetType: dto.targetType, targetId: dto.targetId },
      userId,
    ).catch((err) => this.logger.warn(`Failed to track favorite event: ${err}`));

    return FavoriteResponseDto.fromPlain(favorite as unknown as Record<string, unknown>);
  }

  async findAll(userId: string, targetType?: FavoriteTargetType): Promise<FavoriteResponseDto[]> {
    const where: Record<string, unknown> = { userId };
    if (targetType) where.targetType = targetType;

    const favorites = await this.prisma.favorite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((f) => FavoriteResponseDto.fromPlain(f as unknown as Record<string, unknown>));
  }

  async remove(userId: string, favoriteId: string): Promise<void> {
    const favorite = await this.prisma.favorite.findUnique({
      where: { id: favoriteId },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    if (favorite.userId !== userId) {
      throw new BadRequestException('Cannot delete another user\'s favorite');
    }

    await this.prisma.favorite.delete({
      where: { id: favoriteId },
    });
  }

  private async validateTargetExists(targetType: FavoriteTargetType, targetId: string): Promise<void> {
    if (targetType === FavoriteTargetType.PRODUCT) {
      const product = await this.prisma.product.findUnique({ where: { id: targetId } });
      if (!product || product.status !== 'ACTIVE' || product.deletedAt) {
        throw new NotFoundException('Product not found or inactive');
      }
    } else if (targetType === FavoriteTargetType.STORE) {
      const store = await this.prisma.store.findUnique({ where: { id: targetId } });
      if (!store || store.status !== 'ACTIVE' || store.deletedAt) {
        throw new NotFoundException('Store not found or inactive');
      }
    }
  }
}
