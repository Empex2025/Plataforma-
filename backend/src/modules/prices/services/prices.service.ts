import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PriceType } from '@/generated/prisma/enums.js';
import { PrismaService } from '@/db/prisma.service.js';
import { resolveMembership } from '@/common/helpers/membership.js';
import { CreatePriceDto } from '../dto/create-price.dto.js';
import { PriceResponseDto } from '../dto/price-response.dto.js';
import { SearchIndexQueue } from '@/modules/search/queues/search-index-queue.js';
import { AlertsQueue } from '@/modules/alerts/alerts.queue.js';

@Injectable()
export class PricesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchIndexQueue: SearchIndexQueue,
    private readonly alertsQueue: AlertsQueue,
  ) {}

  async create(
    companyId: string,
    userId: string,
    dto: CreatePriceDto,
  ): Promise<PriceResponseDto> {
    await this.validateMembership(companyId, userId);

    const store = await this.prisma.store.findUnique({ where: { id: dto.storeId } });
    if (!store || store.companyId !== companyId) {
      throw new ForbiddenException('Store does not belong to this company');
    }

    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product || product.companyId !== companyId) {
      throw new ForbiddenException('Product does not belong to this company');
    }

    const validFrom = dto.validFrom ? new Date(dto.validFrom) : new Date();
    const validTo = dto.validTo ? new Date(dto.validTo) : null;

    if (validTo && validTo < validFrom) {
      throw new BadRequestException('validTo must be after validFrom');
    }

    try {
      const price = await this.prisma.$transaction(async (tx) => {
        await tx.price.updateMany({
          where: {
            storeId: dto.storeId,
            productId: dto.productId,
            type: dto.type ?? PriceType.REGULAR,
            validTo: null,
          },
          data: { validTo: new Date() },
        });

        return tx.price.create({
          data: {
            storeId: dto.storeId,
            productId: dto.productId,
            type: dto.type ?? PriceType.REGULAR,
            value: dto.value,
            validFrom,
            validTo,
          },
        });
      });

      await this.searchIndexQueue.indexProduct(dto.productId);
      await this.alertsQueue.evaluate({
        storeId: dto.storeId,
        productId: dto.productId,
        price: Number(price.value),
      });

      return PriceResponseDto.fromPlain(price);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
        throw new ConflictException('Price already exists for this store, product and type');
      }
      throw error;
    }
  }

  async list(
    companyId: string,
    userId: string,
    filters?: { storeId?: string; productId?: string; type?: PriceType },
  ): Promise<PriceResponseDto[]> {
    await this.validateMembership(companyId, userId);

    const where: Record<string, unknown> = {
      store: { companyId },
      ...(filters?.storeId && { storeId: filters.storeId }),
      ...(filters?.productId && { productId: filters.productId }),
      ...(filters?.type && { type: filters.type }),
    };

    const prices = await this.prisma.price.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return prices.map((p) => PriceResponseDto.fromPlain(p));
  }

  async findById(
    companyId: string,
    userId: string,
    priceId: string,
  ): Promise<PriceResponseDto> {
    await this.validateMembership(companyId, userId);

    const price = await this.prisma.price.findUnique({
      where: { id: priceId },
      include: { store: { select: { companyId: true } } },
    });

    if (!price || price.store.companyId !== companyId) {
      throw new NotFoundException('Price not found');
    }

    return PriceResponseDto.fromPlain(price);
  }

  private async validateMembership(companyId: string, userId: string) {
    return resolveMembership(this.prisma, companyId, userId);
  }
}
