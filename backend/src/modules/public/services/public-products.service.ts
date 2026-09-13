import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { EventsService } from '@/modules/events/events.service.js';
import { DiscountType, EventType } from '@/generated/prisma/enums.js';
import { PublicProductQueryDto } from '../dto/public-product-query.dto.js';
import { PublicOfferResponseDto } from '../dto/public-offer-response.dto.js';
import { PublicProductResponseDto } from '../dto/public-product-response.dto.js';
import {
  queryStoreAvailability,
  toStoreAvailabilityDto,
} from '../helpers/public-availability.js';
import {
  PublicCompanyRecord,
  PublicProductRecord,
  resolvePublicCompany,
  resolvePublicProduct,
} from '../helpers/public-resolver.js';
import { computeTrustSignals } from '../helpers/trust-signals.js';

interface RawGenericOffer {
  id: string;
  title: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  startsAt: string | null;
  endsAt: string | null;
}

@Injectable()
export class PublicProductsService {
  private readonly logger = new Logger(PublicProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  async findBySlug(
    companySlug: string,
    productSlug: string,
    query: PublicProductQueryDto,
    userId: string | null = null,
  ): Promise<PublicProductResponseDto> {
    const company = await resolvePublicCompany(this.prisma, companySlug);
    const product = await resolvePublicProduct(
      this.prisma,
      company.id,
      productSlug,
    );

    const hasGeo = query.lat !== undefined && query.lng !== undefined;

    const rows = await queryStoreAvailability(this.prisma, {
      companyId: company.id,
      productId: product.id,
      lat: hasGeo ? query.lat : undefined,
      lng: hasGeo ? query.lng : undefined,
      sort: 'price_asc',
    });

    const stores = rows.map((row) => toStoreAvailabilityDto(row, hasGeo));
    const offers = await this.findProductOffers(company.id, product.id);

    const activePrices = rows
      .filter((row) => row.store_status === 'ACTIVE' && row.price !== null)
      .map((row) => row.price as number);

    this.trackProductView(product, companySlug, userId);

    const dto = new PublicProductResponseDto();
    dto.id = product.id;
    dto.name = product.name;
    dto.slug = product.slug;
    dto.description = product.description;
    dto.imageUrl = product.imageUrl;
    dto.brand = product.brand;
    dto.categories = product.categories;
    dto.stores = stores;
    dto.offers = offers;
    dto.lowestPrice = activePrices.length ? Math.min(...activePrices) : null;
    dto.highestPrice = activePrices.length ? Math.max(...activePrices) : null;
    dto.ratingAverage = product.ratingAverage;
    dto.ratingCount = product.ratingCount;

    const hasActiveOffer = offers.length > 0;
    const priceUpdatedAt = stores.length > 0 ? (stores[0].priceUpdatedAt ?? null) : null;
    dto.trustSignals = computeTrustSignals({
      ratingAverage: product.ratingAverage,
      ratingCount: product.ratingCount,
      priceUpdatedAt,
      hasActiveOffer,
      createdAt: new Date(),
    });

    return dto;
  }

  private trackProductView(
    product: PublicProductRecord,
    companySlug: string,
    userId: string | null,
  ): void {
    void this.eventsService
      .track(
        {
          type: EventType.PRODUCT_VIEW,
          targetType: 'product',
          targetId: product.id,
          metadata: { companySlug, productSlug: product.slug },
        },
        userId,
      )
      .catch((err) => this.logger.warn(`Failed to track product view: ${err}`));
  }

  /**
   * Resolves the public company + product context. Used by the comparison
   * service so slug visibility rules stay in a single place.
   */
  async resolveContext(
    companySlug: string,
    productSlug: string,
  ): Promise<{ company: PublicCompanyRecord; product: PublicProductRecord }> {
    const company = await resolvePublicCompany(this.prisma, companySlug);
    const product = await resolvePublicProduct(
      this.prisma,
      company.id,
      productSlug,
    );
    return { company, product };
  }

  private async findProductOffers(
    companyId: string,
    productId: string,
  ): Promise<PublicOfferResponseDto[]> {
    const rows = await this.prisma.$queryRaw<RawGenericOffer[]>`
      SELECT
        o.id,
        o.title,
        o.description,
        o.discount_type AS "discountType",
        o.discount_value::float8 AS "discountValue",
        o.starts_at AS "startsAt",
        o.ends_at AS "endsAt"
      FROM offers o
      WHERE o.company_id = ${companyId}::uuid
        AND o.store_id IS NULL
        AND o.status = 'ACTIVE'
        AND (o.starts_at IS NULL OR o.starts_at <= NOW())
        AND (o.ends_at IS NULL OR o.ends_at >= NOW())
        AND (
          NOT EXISTS (SELECT 1 FROM offer_products op WHERE op.offer_id = o.id)
          OR EXISTS (
            SELECT 1 FROM offer_products op
            WHERE op.offer_id = o.id AND op.product_id = ${productId}::uuid
          )
        )
      ORDER BY o.title ASC
    `;

    return rows.map((row) =>
      PublicOfferResponseDto.fromPlain({
        id: row.id,
        title: row.title,
        description: row.description,
        discountType: row.discountType as DiscountType,
        discountValue: row.discountValue,
        startsAt: row.startsAt ? new Date(row.startsAt) : null,
        endsAt: row.endsAt ? new Date(row.endsAt) : null,
        storeId: null,
        storeName: null,
      }),
    );
  }
}
