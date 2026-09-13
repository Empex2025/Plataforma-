import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PriceType } from '@/generated/prisma/enums.js';

export class PublicStoreProductCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class PublicStoreProductResponseDto {
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

  @ApiPropertyOptional()
  brandName?: string | null;

  @ApiPropertyOptional()
  price?: number | null;

  @ApiPropertyOptional({ enum: PriceType })
  priceType?: PriceType | null;

  @ApiPropertyOptional({ description: 'Data da última atualização do preço' })
  priceUpdatedAt?: Date | null;

  @ApiProperty()
  available!: boolean;

  @ApiProperty({ type: [PublicStoreProductCategoryDto] })
  categories!: PublicStoreProductCategoryDto[];
}

export class PublicStoreProductsResponseDto {
  @ApiProperty({ type: [PublicStoreProductResponseDto] })
  hits!: PublicStoreProductResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
