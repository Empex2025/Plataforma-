import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { PublicComparisonQueryDto } from '../dto/public-comparison-query.dto.js';
import {
  ProductComparisonResponseDto,
  ComparisonProductDto,
} from '../dto/product-comparison-response.dto.js';
import { PublicStoreAvailabilityDto } from '../dto/public-product-response.dto.js';
import {
  queryStoreAvailability,
  StoreAvailabilityRow,
  toStoreAvailabilityDto,
} from '../helpers/public-availability.js';
import { PublicProductsService } from './public-products.service.js';

@Injectable()
export class PublicComparisonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicProductsService: PublicProductsService,
  ) {}

  async compare(
    companySlug: string,
    productSlug: string,
    query: PublicComparisonQueryDto,
  ): Promise<ProductComparisonResponseDto> {
    const { company, product } = await this.publicProductsService.resolveContext(
      companySlug,
      productSlug,
    );

    const hasGeo = query.lat !== undefined && query.lng !== undefined;

    const rows = await queryStoreAvailability(this.prisma, {
      companyId: company.id,
      productId: product.id,
      lat: hasGeo ? query.lat : undefined,
      lng: hasGeo ? query.lng : undefined,
      radius: query.radius,
      sort: query.sort ?? 'price_asc',
    });

    const stores = rows.map((row) => toStoreAvailabilityDto(row, hasGeo));

    const activePrices = rows
      .filter((row) => row.store_status === 'ACTIVE' && row.price !== null)
      .map((row) => row.price as number);

    const productDto = new ComparisonProductDto();
    productDto.id = product.id;
    productDto.name = product.name;
    productDto.slug = product.slug;
    productDto.imageUrl = product.imageUrl;
    productDto.brand = product.brand;
    productDto.categories = product.categories;

    const dto = new ProductComparisonResponseDto();
    dto.product = productDto;
    dto.stores = stores;
    dto.lowestPrice = activePrices.length ? Math.min(...activePrices) : null;
    dto.nearestStore = hasGeo ? this.findNearest(rows) : null;
    return dto;
  }

  private findNearest(
    rows: StoreAvailabilityRow[],
  ): PublicStoreAvailabilityDto | null {
    let nearest: StoreAvailabilityRow | null = null;
    for (const row of rows) {
      if (row.store_status !== 'ACTIVE' || row.distance === null) {
        continue;
      }
      if (nearest === null || row.distance < (nearest.distance as number)) {
        nearest = row;
      }
    }
    return nearest ? toStoreAvailabilityDto(nearest, true) : null;
  }
}
