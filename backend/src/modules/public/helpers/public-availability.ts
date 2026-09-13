import { PrismaService } from '@/db/prisma.service.js';
import { GeoHelper } from '@/common/helpers/geo.helper.js';
import { DiscountType, PriceType } from '@/generated/prisma/enums.js';
import { MAX_COMPARISON_STORES } from '../public.constants.js';
import { PublicOfferResponseDto } from '../dto/public-offer-response.dto.js';
import { PublicStoreAvailabilityDto } from '../dto/public-product-response.dto.js';

export interface RawAvailabilityOffer {
  id: string;
  title: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  startsAt: string | null;
  endsAt: string | null;
  storeId: string | null;
}

export interface StoreAvailabilityRow {
  store_id: string;
  store_name: string;
  store_slug: string;
  store_status: string;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  lat: number | null;
  lng: number | null;
  price: number | null;
  price_type: PriceType | null;
  price_updated_at: Date | null;
  has_stock: boolean;
  offers: RawAvailabilityOffer[] | null;
  distance: number | null;
}

export interface StoreAvailabilityParams {
  companyId: string;
  productId: string;
  lat?: number;
  lng?: number;
  radius?: number;
  sort?: string;
  limit?: number;
}

/**
 * Returns one row per Store (never multiplied by offers/prices) using scalar
 * subqueries and a json_agg subquery. Rows are ordered in SQL via the outer
 * query so output aliases can be referenced inside expressions.
 */
export async function queryStoreAvailability(
  prisma: PrismaService,
  params: StoreAvailabilityParams,
): Promise<StoreAvailabilityRow[]> {
  const { companyId, productId } = params;
  const hasGeo = params.lat !== undefined && params.lng !== undefined;
  const point = hasGeo ? GeoHelper.makePoint(params.lng!, params.lat!) : null;
  const radius = params.radius ?? null;
  const sort = params.sort ?? 'price_asc';
  const limit = params.limit ?? MAX_COMPARISON_STORES;

  return prisma.$queryRaw<StoreAvailabilityRow[]>`
    SELECT *
    FROM (
      SELECT
        s.id AS store_id,
        s.name AS store_name,
        s.slug AS store_slug,
        s.status AS store_status,
        s.city,
        s.state,
        s.neighborhood,
        ST_Y(s.location::geometry) AS lat,
        ST_X(s.location::geometry) AS lng,
        (
          SELECT p.value::float8
          FROM prices p
          WHERE p.store_id = s.id
            AND p.product_id = ${productId}::uuid
            AND p.valid_to IS NULL
            AND (p.valid_from IS NULL OR p.valid_from <= NOW())
          ORDER BY p.valid_from DESC NULLS LAST, p.created_at DESC
          LIMIT 1
        ) AS price,
        (
          SELECT p.type
          FROM prices p
          WHERE p.store_id = s.id
            AND p.product_id = ${productId}::uuid
            AND p.valid_to IS NULL
            AND (p.valid_from IS NULL OR p.valid_from <= NOW())
          ORDER BY p.valid_from DESC NULLS LAST, p.created_at DESC
          LIMIT 1
        ) AS price_type,
        (
          SELECT p.updated_at
          FROM prices p
          WHERE p.store_id = s.id
            AND p.product_id = ${productId}::uuid
            AND p.valid_to IS NULL
            AND (p.valid_from IS NULL OR p.valid_from <= NOW())
          ORDER BY p.valid_from DESC NULLS LAST, p.created_at DESC
          LIMIT 1
        ) AS price_updated_at,
        COALESCE(
          (
            SELECT i.quantity > 0
            FROM inventory i
            WHERE i.store_id = s.id
              AND i.product_id = ${productId}::uuid
            LIMIT 1
          ),
          false
        ) AS has_stock,
        (
          SELECT COALESCE(json_agg(sub.offer_row ORDER BY sub.title), '[]'::json)
          FROM (
            SELECT
              json_build_object(
                'id', o.id,
                'title', o.title,
                'description', o.description,
                'discountType', o.discount_type,
                'discountValue', o.discount_value::float8,
                'startsAt', o.starts_at,
                'endsAt', o.ends_at,
                'storeId', o.store_id
              ) AS offer_row,
              o.title AS title
            FROM offers o
            WHERE o.company_id = ${companyId}::uuid
              AND o.store_id = s.id
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
          ) sub
        ) AS offers,
        ST_Distance(
          s.location::geography,
          ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography
        ) AS distance
      FROM stores s
      WHERE s.company_id = ${companyId}::uuid
        AND s.deleted_at IS NULL
        AND s.status <> 'INACTIVE'
        AND (
          EXISTS (
            SELECT 1 FROM prices p2
            WHERE p2.store_id = s.id
              AND p2.product_id = ${productId}::uuid
              AND p2.valid_to IS NULL
              AND (p2.valid_from IS NULL OR p2.valid_from <= NOW())
          )
          OR EXISTS (
            SELECT 1 FROM inventory i2
            WHERE i2.store_id = s.id
              AND i2.product_id = ${productId}::uuid
              AND i2.quantity > 0
          )
        )
        AND (
          ${radius}::float8 IS NULL
          OR ST_DWithin(
            s.location::geography,
            ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography,
            ${radius}
          )
        )
    ) t
    ORDER BY
      CASE WHEN ${sort} = 'distance' THEN t.distance END ASC NULLS LAST,
      CASE WHEN ${sort} = 'price_asc' THEN t.price END ASC NULLS LAST,
      CASE WHEN ${sort} = 'price_desc' THEN t.price END DESC NULLS LAST,
      CASE WHEN ${sort} = 'availability' THEN t.has_stock END DESC,
      t.price ASC NULLS LAST,
      t.store_name ASC
    LIMIT ${limit}
  `;
}

export function mapRawOffers(
  offers: RawAvailabilityOffer[] | null,
  storeName: string | null,
): PublicOfferResponseDto[] {
  return (offers ?? []).map((offer) =>
    PublicOfferResponseDto.fromPlain({
      id: offer.id,
      title: offer.title,
      description: offer.description,
      discountType: offer.discountType as DiscountType,
      discountValue: offer.discountValue,
      startsAt: offer.startsAt ? new Date(offer.startsAt) : null,
      endsAt: offer.endsAt ? new Date(offer.endsAt) : null,
      storeId: offer.storeId,
      storeName,
    }),
  );
}

export function toStoreAvailabilityDto(
  row: StoreAvailabilityRow,
  hasGeo: boolean,
): PublicStoreAvailabilityDto {
  const dto = new PublicStoreAvailabilityDto();
  dto.storeId = row.store_id;
  dto.storeName = row.store_name;
  dto.storeSlug = row.store_slug;
  dto.storeStatus = row.store_status;
  dto.city = row.city;
  dto.state = row.state;
  dto.neighborhood = row.neighborhood;
  dto.lat = row.lat;
  dto.lng = row.lng;
  dto.price = row.price;
  dto.priceType = row.price_type;
  dto.priceUpdatedAt = row.price_updated_at ? new Date(row.price_updated_at) : null;
  dto.available = row.store_status === 'ACTIVE' && row.has_stock;
  dto.offers = mapRawOffers(row.offers, row.store_name);
  dto.distance =
    hasGeo && row.distance !== null ? Math.round(row.distance) : null;
  return dto;
}
