import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DiscoveryHitDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: 'product' | 'store';

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiProperty()
  companyId!: string;

  @ApiPropertyOptional()
  brandName?: string | null;

  @ApiPropertyOptional()
  categoryNames?: string[];

  @ApiPropertyOptional()
  tagNames?: string[];

  @ApiPropertyOptional()
  minPrice?: number | null;

  @ApiPropertyOptional()
  maxPrice?: number | null;

  @ApiPropertyOptional()
  hasStock?: boolean;

  @ApiPropertyOptional()
  ratingAverage?: number | null;

  @ApiProperty()
  reasons!: string[];

  @ApiProperty()
  score!: number;

  @ApiPropertyOptional()
  distance?: number | null;
}

export class DiscoveryResponseDto {
  @ApiProperty({ type: [DiscoveryHitDto] })
  hits!: DiscoveryHitDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
