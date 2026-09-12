import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { EventsService } from '@/modules/events/events.service.js';
import { EventType, PriceType } from '@/generated/prisma/enums.js';
import { PublicStoreProductsQueryDto } from '../dto/public-store-products-query.dto.js';
import { PublicStoreResponseDto, PublicStoreCategoriesResponseDto } from '../dto/public-store-response.dto.js';
import {
  PublicStoreProductResponseDto,
  PublicStoreProductsResponseDto,
} from '../dto/public-store-product-response.dto.js';
import { PUBLIC_DEFAULT_PAGE_LIMIT } from '../public.constants.js';
import {
  PublicStoreRecord,
  resolvePublicCompany,
  resolvePublicStore,
} from '../helpers/public-resolver.js';

interface StoreProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  brand_name: string | null;
  price: number | null;
  price_type: PriceType | null;
  has_stock: boolean;
  categories: Array<{ id: string; name: string; slug: string }> | null;
  updated_at: Date;
  total_count: number;
}

interface StoreCategoryRow {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  product_count: number;
}

@Injectable()
export class PublicStoresService {
  private readonly logger = new Logger(PublicStoresService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  async findBySlug(
    companySlug: string,
    storeSlug: string,
    userId: string | null = null,
  ): Promise<PublicStoreResponseDto> {
    const company = await resolvePublicCompany(this.prisma, companySlug);
    const store = await resolvePublicStore(this.prisma, company.id, storeSlug);

    const productCount = await this.countPublicProducts(company.id, store.id);
    const activeOfferCount = await this.countActiveOffers(company.id, store.id);

    this.trackStoreView(store, companySlug, userId);

    return PublicStoreResponseDto.fromPlain({
      ...store,
      companyName: company.name,
      productCount,
      activeOfferCount,
    });
  }

  private trackStoreView(
    store: PublicStoreRecord,
    companySlug: string,
    userId: string | null,
  ): void {
    void this.eventsService
      .track(
        {
          type: EventType.STORE_VIEW,
          targetType: 'store',
          targetId: store.id,
          metadata: { companySlug, storeSlug: store.slug },
        },
        userId,
      )
      .catch((err) => this.logger.warn(`Failed to track store view: ${err}`));
  }

  async listProducts(
    companySlug: string,
    storeSlug: string,
    query: PublicStoreProductsQueryDto,
  ): Promise<PublicStoreProductsResponseDto> {
    const company = await resolvePublicCompany(this.prisma, companySlug);
    const store = await resolvePublicStore(this.prisma, company.id, storeSlug);

    const page = query.page ?? 1;
    const limit = query.limit ?? PUBLIC_DEFAULT_PAGE_LIMIT;
    const offset = (page - 1) * limit;
    const sort = query.sort ?? 'name';
    const q = query.q ?? null;
    const brandId = query.brandId ?? null;
    const categoryId = query.categoryId ?? null;

    const rows = await this.prisma.$queryRaw<StoreProductRow[]>`
      SELECT * FROM (
        SELECT
          p.id,
          p.name,
          p.slug,
          p.description,
          p.image_url,
          p.updated_at,
          b.name AS brand_name,
          (
            SELECT pr.value::float8
            FROM prices pr
            WHERE pr.store_id = ${store.id}::uuid
              AND pr.product_id = p.id
              AND pr.valid_to IS NULL
            ORDER BY pr.valid_from DESC NULLS LAST, pr.created_at DESC
            LIMIT 1
          ) AS price,
          (
            SELECT pr.type
            FROM prices pr
            WHERE pr.store_id = ${store.id}::uuid
              AND pr.product_id = p.id
              AND pr.valid_to IS NULL
            ORDER BY pr.valid_from DESC NULLS LAST, pr.created_at DESC
            LIMIT 1
          ) AS price_type,
          COALESCE(
            (
              SELECT i.quantity > 0
              FROM inventory i
              WHERE i.store_id = ${store.id}::uuid
                AND i.product_id = p.id
              LIMIT 1
            ),
            false
          ) AS has_stock,
          (
            SELECT COALESCE(
              json_agg(json_build_object('id', c.id, 'name', c.name, 'slug', c.slug)),
              '[]'::json
            )
            FROM product_categories pc
            JOIN categories c ON c.id = pc.category_id
            WHERE pc.product_id = p.id
          ) AS categories,
          COUNT(*) OVER()::int AS total_count
        FROM products p
        LEFT JOIN brands b ON b.id = p.brand_id
        WHERE p.company_id = ${company.id}::uuid
          AND p.status = 'ACTIVE'
          AND p.deleted_at IS NULL
          AND (${q}::text IS NULL OR p.name ILIKE '%' || ${q} || '%')
          AND (${brandId}::uuid IS NULL OR p.brand_id = ${brandId}::uuid)
          AND (
            ${categoryId}::uuid IS NULL
            OR EXISTS (
              SELECT 1 FROM product_categories pc
              WHERE pc.product_id = p.id AND pc.category_id = ${categoryId}::uuid
            )
          )
          AND (
            EXISTS (
              SELECT 1 FROM prices pr2
              WHERE pr2.store_id = ${store.id}::uuid
                AND pr2.product_id = p.id
                AND pr2.valid_to IS NULL
            )
            OR EXISTS (
              SELECT 1 FROM inventory i2
              WHERE i2.store_id = ${store.id}::uuid
                AND i2.product_id = p.id
                AND i2.quantity > 0
            )
          )
      ) t
      ORDER BY
        CASE WHEN ${sort} = 'price_asc' THEN t.price END ASC NULLS LAST,
        CASE WHEN ${sort} = 'price_desc' THEN t.price END DESC NULLS LAST,
        CASE WHEN ${sort} = 'updated' THEN t.updated_at END DESC,
        t.name ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = rows.length ? rows[0].total_count : 0;

    const dto = new PublicStoreProductsResponseDto();
    dto.hits = rows.map((row) => this.toStoreProduct(row, store));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }

  async listCategories(
    companySlug: string,
    storeSlug: string,
  ): Promise<PublicStoreCategoriesResponseDto> {
    const company = await resolvePublicCompany(this.prisma, companySlug);
    const store = await resolvePublicStore(this.prisma, company.id, storeSlug);

    const rows = await this.prisma.$queryRaw<StoreCategoryRow[]>`
      SELECT
        c.id,
        c.name,
        c.slug,
        c.icon,
        COUNT(DISTINCT p.id)::int AS product_count
      FROM categories c
      JOIN product_categories pc ON pc.category_id = c.id
      JOIN products p ON p.id = pc.product_id
        AND p.company_id = ${company.id}::uuid
        AND p.status = 'ACTIVE'
        AND p.deleted_at IS NULL
        AND (
          EXISTS (
            SELECT 1 FROM prices pr
            WHERE pr.store_id = ${store.id}::uuid
              AND pr.product_id = p.id
              AND pr.valid_to IS NULL
          )
          OR EXISTS (
            SELECT 1 FROM inventory i
            WHERE i.store_id = ${store.id}::uuid
              AND i.product_id = p.id
              AND i.quantity > 0
          )
        )
      GROUP BY c.id, c.name, c.slug, c.icon
      ORDER BY c.name ASC
    `;

    const dto = new PublicStoreCategoriesResponseDto();
    dto.categories = rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      icon: row.icon,
      productCount: row.product_count,
    }));
    return dto;
  }

  private toStoreProduct(
    row: StoreProductRow,
    store: PublicStoreRecord,
  ): PublicStoreProductResponseDto {
    const dto = new PublicStoreProductResponseDto();
    dto.id = row.id;
    dto.name = row.name;
    dto.slug = row.slug;
    dto.description = row.description;
    dto.imageUrl = row.image_url;
    dto.brandName = row.brand_name;
    dto.price = row.price;
    dto.priceType = row.price_type;
    dto.available = store.status === 'ACTIVE' && row.has_stock;
    dto.categories = row.categories ?? [];
    return dto;
  }

  private async countPublicProducts(
    companyId: string,
    storeId: string,
  ): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM products p
      WHERE p.company_id = ${companyId}::uuid
        AND p.status = 'ACTIVE'
        AND p.deleted_at IS NULL
        AND (
          EXISTS (
            SELECT 1 FROM prices pr
            WHERE pr.store_id = ${storeId}::uuid
              AND pr.product_id = p.id
              AND pr.valid_to IS NULL
          )
          OR EXISTS (
            SELECT 1 FROM inventory i
            WHERE i.store_id = ${storeId}::uuid
              AND i.product_id = p.id
              AND i.quantity > 0
          )
        )
    `;
    return rows[0]?.count ?? 0;
  }

  private async countActiveOffers(
    companyId: string,
    storeId: string,
  ): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM offers o
      WHERE o.company_id = ${companyId}::uuid
        AND (o.store_id IS NULL OR o.store_id = ${storeId}::uuid)
        AND o.status = 'ACTIVE'
        AND (o.starts_at IS NULL OR o.starts_at <= NOW())
        AND (o.ends_at IS NULL OR o.ends_at >= NOW())
    `;
    return rows[0]?.count ?? 0;
  }
}
