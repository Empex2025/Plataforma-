import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PublicProductBrandDto,
  PublicProductCategoryDto,
  PublicStoreAvailabilityDto,
} from './public-product-response.dto.js';

export class ComparisonProductDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiPropertyOptional({ type: PublicProductBrandDto })
  brand?: PublicProductBrandDto | null;

  @ApiPropertyOptional({ type: [PublicProductCategoryDto] })
  categories?: PublicProductCategoryDto[];
}

export class ProductComparisonResponseDto {
  @ApiProperty({ type: ComparisonProductDto })
  product!: ComparisonProductDto;

  @ApiProperty({ type: [PublicStoreAvailabilityDto] })
  stores!: PublicStoreAvailabilityDto[];

  @ApiPropertyOptional({
    description: 'Lowest current price among ACTIVE stores. null when no price exists.',
  })
  lowestPrice?: number | null;

  @ApiPropertyOptional({
    type: PublicStoreAvailabilityDto,
    description: 'Nearest ACTIVE store with a current price, when consumer coordinates are given.',
  })
  nearestStore?: PublicStoreAvailabilityDto | null;
}
