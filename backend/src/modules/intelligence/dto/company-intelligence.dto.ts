import { ApiProperty } from '@nestjs/swagger';

export class TopEntityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  count!: number;
}

export class CompanyEngagementDto {
  @ApiProperty({ description: 'Product views (PRODUCT_VIEW) in period' })
  productViews!: number;

  @ApiProperty({ description: 'Store views (STORE_VIEW) in period' })
  storeViews!: number;

  @ApiProperty({ description: 'Product favorites (PRODUCT_FAVORITE) in period' })
  productFavorites!: number;

  @ApiProperty({ description: 'Store favorites (STORE_FAVORITE) in period' })
  storeFavorites!: number;

  @ApiProperty({ description: 'Contact clicks (WHATSAPP_CLICK + PHONE_CLICK) in period' })
  contacts!: number;

  @ApiProperty({ description: 'Reviews created (REVIEW_CREATED) in period' })
  reviewsCreated!: number;

  @ApiProperty({ description: 'Reviews approved (REVIEW_APPROVED) in period' })
  reviewsApproved!: number;
}

export class CompanyDemandGapHeuristicDto {
  @ApiProperty({
    description: 'Total store views used in funnel calculation',
  })
  totalViews!: number;

  @ApiProperty({
    description: 'Total contact clicks (WHATSAPP_CLICK + PHONE_CLICK) in period',
  })
  totalContacts!: number;

  @ApiProperty({
    description: 'Conversion rate: (totalContacts / totalViews) * 100',
  })
  conversionRate!: number;

  @ApiProperty({
    description:
      'Aviso explícito: os dados são sinais heurísticos de oportunidade, NÃO representam demanda real ou comprovada.',
    enum: ['HEURISTICO_NAO_DEFINITIVO'],
    default: 'HEURISTICO_NAO_DEFINITIVO',
  })
  heuristicDisclaimer!: 'HEURISTICO_NAO_DEFINITIVO';
}

export class UnmetSearchDto {
  @ApiProperty({ description: 'Search query with zero results' })
  query!: string;

  @ApiProperty({ description: 'Number of times this query was searched with zero results' })
  count!: number;
}

export class CategoryDemandGapDto {
  @ApiProperty()
  categoryId!: string;

  @ApiProperty()
  categoryName!: string;

  @ApiProperty({
    description:
      'Heuristic demand signal: number of PRODUCT_VIEW events for products in this category. NOT definitive demand measurement.',
  })
  demand!: number;

  @ApiProperty({ description: 'Number of active products in this category' })
  supply!: number;
}

export class TimeSeriesPointDto {
  @ApiProperty({ description: 'Date bucket (ISO 8601)' })
  date!: string;

  @ApiProperty({ description: 'Views in this period' })
  views!: number;

  @ApiProperty({ description: 'Favorites in this period' })
  favorites!: number;

  @ApiProperty({ description: 'Contact clicks in this period' })
  contacts!: number;

  @ApiProperty({ description: 'Reviews in this period' })
  reviews!: number;
}

export class TimeSeriesDto {
  @ApiProperty({ description: 'Granularity: day or week' })
  granularity!: 'day' | 'week';

  @ApiProperty()
  periodStart!: Date;

  @ApiProperty()
  periodEnd!: Date;

  @ApiProperty({ type: [TimeSeriesPointDto] })
  series!: TimeSeriesPointDto[];
}

export class CompanyIntelligenceDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty({ type: [TopEntityDto] })
  topProducts!: TopEntityDto[];

  @ApiProperty({ type: [TopEntityDto] })
  topStores!: TopEntityDto[];

  @ApiProperty({ type: CompanyEngagementDto })
  engagement!: CompanyEngagementDto;

  @ApiProperty({ type: CompanyDemandGapHeuristicDto })
  contactFunnel!: CompanyDemandGapHeuristicDto;

  @ApiProperty()
  periodStart!: Date;

  @ApiProperty()
  periodEnd!: Date;
}

export class CompanyDemandGapResponseDto {
  @ApiProperty({ type: CompanyDemandGapHeuristicDto })
  demandGap!: CompanyDemandGapHeuristicDto;

  @ApiProperty({
    type: [UnmetSearchDto],
    description:
      'G1 — Sinal heurístico: buscas sem resultado no período. NÃO representa demanda real ou comprovada.',
  })
  unmetSearches!: UnmetSearchDto[];

  @ApiProperty({
    type: [CategoryDemandGapDto],
    description:
      'G3 — Sinal heurístico: categorias com alta demanda e pouca oferta. NÃO representa demanda real ou comprovada.',
  })
  categoryGaps!: CategoryDemandGapDto[];
}
