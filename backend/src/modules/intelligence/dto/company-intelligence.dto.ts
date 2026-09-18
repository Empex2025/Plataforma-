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
  @ApiProperty({ description: 'Visualizações de produtos (PRODUCT_VIEW) no período' })
  productViews!: number;

  @ApiProperty({ description: 'Visualizações de lojas (STORE_VIEW) no período' })
  storeViews!: number;

  @ApiProperty({ description: 'Favoritos de produtos (PRODUCT_FAVORITE) no período' })
  productFavorites!: number;

  @ApiProperty({ description: 'Favoritos de lojas (STORE_FAVORITE) no período' })
  storeFavorites!: number;

  @ApiProperty({ description: 'Cliques de contato (WHATSAPP_CLICK + PHONE_CLICK) no período' })
  contacts!: number;

  @ApiProperty({ description: 'Avaliações criadas (REVIEW_CREATED) no período' })
  reviewsCreated!: number;

  @ApiProperty({ description: 'Avaliações aprovadas (REVIEW_APPROVED) no período' })
  reviewsApproved!: number;
}

export class CompanyDemandGapHeuristicDto {
  @ApiProperty({
    description: 'Total de visualizações de lojas usadas no cálculo do funil',
  })
  totalViews!: number;

  @ApiProperty({
    description: 'Total de cliques de contato (WHATSAPP_CLICK + PHONE_CLICK) no período',
  })
  totalContacts!: number;

  @ApiProperty({
    description: 'Taxa de conversão: (totalContacts / totalViews) * 100',
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
  @ApiProperty({ description: 'Termo de busca sem resultados' })
  query!: string;

  @ApiProperty({ description: 'Número de vezes que este termo foi buscado sem resultados' })
  count!: number;
}

export class CategoryDemandGapDto {
  @ApiProperty()
  categoryId!: string;

  @ApiProperty()
  categoryName!: string;

  @ApiProperty({
    description:
      'Sinal heurístico de demanda: número de eventos PRODUCT_VIEW para produtos desta categoria. NÃO é uma medição definitiva de demanda.',
  })
  demand!: number;

  @ApiProperty({ description: 'Número de produtos ativos nesta categoria' })
  supply!: number;
}

export class TimeSeriesPointDto {
  @ApiProperty({ description: 'Intervalo de data (ISO 8601)' })
  date!: string;

  @ApiProperty({ description: 'Visualizações neste período' })
  views!: number;

  @ApiProperty({ description: 'Favoritos neste período' })
  favorites!: number;

  @ApiProperty({ description: 'Cliques de contato neste período' })
  contacts!: number;

  @ApiProperty({ description: 'Avaliações neste período' })
  reviews!: number;
}

export class TimeSeriesDto {
  @ApiProperty({ description: 'Granularidade: day ou week' })
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
