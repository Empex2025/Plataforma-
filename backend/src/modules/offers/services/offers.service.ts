import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { CreateOfferDto } from '../dto/create-offer.dto.js';
import { UpdateOfferDto } from '../dto/update-offer.dto.js';
import { AddProductToOfferDto } from '../dto/add-product-to-offer.dto.js';
import { OfferResponseDto } from '../dto/offer-response.dto.js';
import { SearchIndexQueue } from '@/modules/search/queues/search-index-queue.js';

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchIndexQueue: SearchIndexQueue,
  ) {}

  async create(
    companyId: string,
    userId: string,
    dto: CreateOfferDto,
  ): Promise<OfferResponseDto> {
    await this.validateMembership(companyId, userId);

    if (dto.storeId) {
      const store = await this.prisma.store.findUnique({
        where: { id: dto.storeId },
      });
      if (!store || store.companyId !== companyId) {
        throw new ForbiddenException('Store does not belong to this company');
      }
    }

    if (dto.startsAt && dto.endsAt && dto.startsAt > dto.endsAt) {
      throw new BadRequestException('startsAt must be before endsAt');
    }

    const offer = await this.prisma.offer.create({
      data: {
        companyId,
        storeId: dto.storeId,
        title: dto.title,
        description: dto.description,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
      },
    });

    if (dto.storeId) {
      await this.searchIndexQueue.indexStore(dto.storeId);
    }

    return OfferResponseDto.fromPlain(offer);
  }

  async listByCompany(
    companyId: string,
    userId: string,
  ): Promise<OfferResponseDto[]> {
    await this.validateMembership(companyId, userId);

    const offers = await this.prisma.offer.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return offers.map((offer) => OfferResponseDto.fromPlain(offer));
  }

  async findById(
    companyId: string,
    offerId: string,
    userId: string,
  ): Promise<OfferResponseDto> {
    await this.validateMembership(companyId, userId);

    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
    });

    if (!offer || offer.companyId !== companyId) {
      throw new NotFoundException('Offer not found');
    }

    return OfferResponseDto.fromPlain(offer);
  }

  async update(
    companyId: string,
    offerId: string,
    userId: string,
    dto: UpdateOfferDto,
  ): Promise<OfferResponseDto> {
    await this.validateMembership(companyId, userId);

    const existing = await this.prisma.offer.findUnique({
      where: { id: offerId },
    });

    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException('Offer not found');
    }

    if (dto.storeId) {
      const store = await this.prisma.store.findUnique({
        where: { id: dto.storeId },
      });
      if (!store || store.companyId !== companyId) {
        throw new ForbiddenException('Store does not belong to this company');
      }
    }

    const startsAt = dto.startsAt ?? existing.startsAt;
    const endsAt = dto.endsAt ?? existing.endsAt;
    if (startsAt && endsAt && startsAt > endsAt) {
      throw new BadRequestException('startsAt must be before endsAt');
    }

    const offer = await this.prisma.offer.update({
      where: { id: offerId },
      data: {
        title: dto.title,
        description: dto.description,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        storeId: dto.storeId,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
      },
    });

    const oldStoreId = existing.storeId;
    const newStoreId = offer.storeId;
    const storeIdsToReindex = new Set<string>();
    if (oldStoreId) storeIdsToReindex.add(oldStoreId);
    if (newStoreId && newStoreId !== oldStoreId) storeIdsToReindex.add(newStoreId);
    for (const sid of storeIdsToReindex) {
      await this.searchIndexQueue.indexStore(sid);
    }

    return OfferResponseDto.fromPlain(offer);
  }

  async addProduct(
    companyId: string,
    userId: string,
    offerId: string,
    dto: AddProductToOfferDto,
  ): Promise<void> {
    await this.validateMembership(companyId, userId);

    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
    });
    if (!offer || offer.companyId !== companyId) {
      throw new ForbiddenException('Offer does not belong to this company');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product || product.companyId !== companyId) {
      throw new ForbiddenException('Product does not belong to this company');
    }

    try {
      await this.prisma.offerProduct.create({
        data: {
          offerId,
          productId: dto.productId,
        },
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('Product already added to this offer');
      }
      throw error;
    }

    if (offer.storeId) {
      await this.searchIndexQueue.indexStore(offer.storeId);
    }
  }

  async removeProduct(
    companyId: string,
    userId: string,
    offerId: string,
    productId: string,
  ): Promise<void> {
    await this.validateMembership(companyId, userId);

    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
    });
    if (!offer || offer.companyId !== companyId) {
      throw new ForbiddenException('Offer does not belong to this company');
    }

    const offerProduct = await this.prisma.offerProduct.findUnique({
      where: { offerId_productId: { offerId, productId } },
    });

    if (!offerProduct) {
      throw new NotFoundException('Product not found in this offer');
    }

    await this.prisma.offerProduct.delete({
      where: { offerId_productId: { offerId, productId } },
    });

    if (offer.storeId) {
      await this.searchIndexQueue.indexStore(offer.storeId);
    }
  }

  async listProducts(
    companyId: string,
    offerId: string,
    userId: string,
  ) {
    await this.validateMembership(companyId, userId);

    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
    });
    if (!offer || offer.companyId !== companyId) {
      throw new ForbiddenException('Offer does not belong to this company');
    }

    const offerProducts = await this.prisma.offerProduct.findMany({
      where: { offerId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });

    return offerProducts.map((op) => ({
      id: op.id,
      offerId: op.offerId,
      productId: op.productId,
      product: op.product,
      createdAt: op.createdAt,
    }));
  }

  private async validateMembership(companyId: string, userId: string) {
    const userCompany = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: { userId, companyId },
      },
    });

    if (!userCompany) {
      throw new ForbiddenException('User does not belong to this company');
    }

    return userCompany;
  }
}
