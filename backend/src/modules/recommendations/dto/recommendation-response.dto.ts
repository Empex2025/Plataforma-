import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecommendationReasonCode } from '../recommendations.constants.js';

export class RecommendationReasonDto {
  @ApiProperty({ enum: RecommendationReasonCode })
  code!: RecommendationReasonCode;

  @ApiProperty()
  label!: string;
}

export class RecommendationItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['product', 'store', 'offer'] })
  type!: 'product' | 'store' | 'offer';

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  companyId!: string;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiPropertyOptional()
  minPrice?: number | null;

  @ApiPropertyOptional()
  maxPrice?: number | null;

  @ApiPropertyOptional()
  hasStock?: boolean;

  @ApiPropertyOptional()
  ratingAverage?: number | null;

  @ApiPropertyOptional()
  distance?: number | null;

  @ApiProperty({ type: [RecommendationReasonDto] })
  reasons!: RecommendationReasonDto[];
}

export class RecommendationResponseDto {
  @ApiProperty({ type: [RecommendationItemDto] })
  items!: RecommendationItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
