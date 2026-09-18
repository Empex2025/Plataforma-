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
    description: 'Menor preço atual entre lojas ACTIVE. nulo quando não existe preço.',
  })
  lowestPrice?: number | null;

  @ApiPropertyOptional({
    type: PublicStoreAvailabilityDto,
    description: 'Loja ACTIVE mais próxima com preço atual, quando as coordenadas do consumidor são informadas.',
  })
  nearestStore?: PublicStoreAvailabilityDto | null;
}
