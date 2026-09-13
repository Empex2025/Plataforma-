import { ApiProperty } from '@nestjs/swagger';
import { TopEntityDto, UnmetSearchDto, CategoryDemandGapDto } from './company-intelligence.dto.js';

export class PlatformTotalsDto {
  @ApiProperty({ description: 'Total events in period' })
  totalEvents!: number;

  @ApiProperty({ description: 'Total product views' })
  totalViews!: number;

  @ApiProperty({ description: 'Total contact clicks (WhatsApp/phone)' })
  totalContacts!: number;

  @ApiProperty({ description: 'Total searches performed' })
  totalSearches!: number;

  @ApiProperty({ description: 'Active companies on the platform' })
  activeCompanies!: number;

  @ApiProperty({ description: 'Active stores on the platform' })
  activeStores!: number;

  @ApiProperty({ description: 'Active products on the platform' })
  activeProducts!: number;

  @ApiProperty({ description: 'Active users on the platform' })
  activeUsers!: number;
}

export class TopCategoryDto {
  @ApiProperty()
  categoryId!: string;

  @ApiProperty()
  categoryName!: string;

  @ApiProperty({
    description:
      'Heuristic demand signal: PRODUCT_VIEW count for products in this category. NOT definitive demand measurement.',
  })
  demand!: number;

  @ApiProperty({ description: 'Number of active products in this category' })
  supply!: number;
}

export class TopRegionDto {
  @ApiProperty()
  city!: string;

  @ApiProperty()
  state!: string;

  @ApiProperty()
  count!: number;
}

export class PlatformIntelligenceDto {
  @ApiProperty({ type: [TopEntityDto], description: 'Most engaged products globally' })
  topProducts!: TopEntityDto[];

  @ApiProperty({ type: [TopEntityDto], description: 'Most engaged stores globally' })
  topStores!: TopEntityDto[];

  @ApiProperty({ type: [TopEntityDto], description: 'Most frequent searches globally' })
  topSearches!: TopEntityDto[];

  @ApiProperty({ type: [TopEntityDto], description: 'Companies with highest engagement' })
  topCompanies!: TopEntityDto[];

  @ApiProperty({
    type: [TopCategoryDto],
    description: 'Categories with heuristic demand signals. NOT definitive demand measurement.',
  })
  topCategories!: TopCategoryDto[];

  @ApiProperty({ type: PlatformTotalsDto, description: 'Platform totals' })
  totals!: PlatformTotalsDto;

  @ApiProperty()
  periodStart!: Date;

  @ApiProperty()
  periodEnd!: Date;
}

export class PlatformDemandGapResponseDto {
  @ApiProperty({
    type: [UnmetSearchDto],
    description:
      'G1 — Heuristic signal: searches with zero results. NOT definitive demand measurement.',
  })
  unmetSearches!: UnmetSearchDto[];

  @ApiProperty({
    type: [CategoryDemandGapDto],
    description:
      'G3 — Heuristic signal: categories with high interest and low supply. NOT definitive demand measurement.',
  })
  categoryGaps!: CategoryDemandGapDto[];
}

export class PlatformTimeSeriesDto {
  @ApiProperty({ description: 'Granularity: day or week' })
  granularity!: 'day' | 'week';

  @ApiProperty()
  periodStart!: Date;

  @ApiProperty()
  periodEnd!: Date;

  @ApiProperty({ type: [Object] })
  series!: Array<{
    date: string;
    views: number;
    favorites: number;
    contacts: number;
    reviews: number;
  }>;
}
