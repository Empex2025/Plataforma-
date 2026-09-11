import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PriceType } from '../../../generated/prisma/enums.js';
import { PublicOfferResponseDto } from './public-offer-response.dto.js';

export class PublicProductBrandDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class PublicProductCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  icon?: string | null;
}

export class PublicStoreAvailabilityDto {
  @ApiProperty()
  storeId!: string;

  @ApiProperty()
  storeName!: string;

  @ApiProperty()
  storeSlug!: string;

  @ApiProperty({ description: 'Public store status: ACTIVE or CLOSED_TEMPORARY' })
  storeStatus!: string;

  @ApiPropertyOptional()
  city?: string | null;

  @ApiPropertyOptional()
  state?: string | null;

  @ApiPropertyOptional()
  neighborhood?: string | null;

  @ApiPropertyOptional()
  lat?: number | null;

  @ApiPropertyOptional()
  lng?: number | null;

  @ApiPropertyOptional({ description: 'Current price (validTo IS NULL). null when unavailable.' })
  price?: number | null;

  @ApiPropertyOptional({ enum: PriceType })
  priceType?: PriceType | null;

  @ApiProperty({
    description:
      'Commercial availability: store is ACTIVE and has stock. CLOSED_TEMPORARY stores are always false.',
  })
  available!: boolean;

  @ApiPropertyOptional({ type: [PublicOfferResponseDto] })
  offers?: PublicOfferResponseDto[];

  @ApiPropertyOptional({ description: 'Distance in meters from consumer coordinates' })
  distance?: number | null;
}

export class PublicProductResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiPropertyOptional({ type: PublicProductBrandDto })
  brand?: PublicProductBrandDto | null;

  @ApiPropertyOptional({ type: [PublicProductCategoryDto] })
  categories?: PublicProductCategoryDto[];

  @ApiProperty({ type: [PublicStoreAvailabilityDto] })
  stores!: PublicStoreAvailabilityDto[];

  @ApiPropertyOptional({
    type: [PublicOfferResponseDto],
    description: 'Company-wide offers applicable to this product (storeId IS NULL)',
  })
  offers?: PublicOfferResponseDto[];

  @ApiPropertyOptional({
    description: 'Lowest current price among ACTIVE stores. null when no price exists.',
  })
  lowestPrice?: number | null;

  @ApiPropertyOptional({
    description: 'Highest current price among ACTIVE stores. null when no price exists.',
  })
  highestPrice?: number | null;
}
