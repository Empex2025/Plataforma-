import { ApiProperty } from '@nestjs/swagger';
import { TopEntityDto, UnmetSearchDto, CategoryDemandGapDto } from './company-intelligence.dto.js';

export class PlatformTotalsDto {
  @ApiProperty({ description: 'Total de eventos no período' })
  totalEvents!: number;

  @ApiProperty({ description: 'Total de visualizações de produtos' })
  totalViews!: number;

  @ApiProperty({ description: 'Total de cliques de contato (WhatsApp/telefone)' })
  totalContacts!: number;

  @ApiProperty({ description: 'Total de buscas realizadas' })
  totalSearches!: number;

  @ApiProperty({ description: 'Empresas ativas na plataforma' })
  activeCompanies!: number;

  @ApiProperty({ description: 'Lojas ativas na plataforma' })
  activeStores!: number;

  @ApiProperty({ description: 'Produtos ativos na plataforma' })
  activeProducts!: number;

  @ApiProperty({ description: 'Usuários ativos na plataforma' })
  activeUsers!: number;
}

export class TopCategoryDto {
  @ApiProperty()
  categoryId!: string;

  @ApiProperty()
  categoryName!: string;

  @ApiProperty({
    description:
      'Sinal heurístico de demanda: contagem de PRODUCT_VIEW para produtos desta categoria. NÃO é uma medição definitiva de demanda.',
  })
  demand!: number;

  @ApiProperty({ description: 'Número de produtos ativos nesta categoria' })
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
  @ApiProperty({ type: [TopEntityDto], description: 'Produtos mais engajados globalmente' })
  topProducts!: TopEntityDto[];

  @ApiProperty({ type: [TopEntityDto], description: 'Lojas mais engajadas globalmente' })
  topStores!: TopEntityDto[];

  @ApiProperty({ type: [TopEntityDto], description: 'Buscas mais frequentes globalmente' })
  topSearches!: TopEntityDto[];

  @ApiProperty({ type: [TopEntityDto], description: 'Empresas com maior engajamento' })
  topCompanies!: TopEntityDto[];

  @ApiProperty({
    type: [TopCategoryDto],
    description: 'Categorias com sinais heurísticos de demanda. NÃO é uma medição definitiva de demanda.',
  })
  topCategories!: TopCategoryDto[];

  @ApiProperty({ type: PlatformTotalsDto, description: 'Totais da plataforma' })
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
      'G1 — Sinal heurístico: buscas sem resultado. NÃO é uma medição definitiva de demanda.',
  })
  unmetSearches!: UnmetSearchDto[];

  @ApiProperty({
    type: [CategoryDemandGapDto],
    description:
      'G3 — Sinal heurístico: categorias com alto interesse e pouca oferta. NÃO é uma medição definitiva de demanda.',
  })
  categoryGaps!: CategoryDemandGapDto[];
}

export class PlatformTimeSeriesDto {
  @ApiProperty({ description: 'Granularidade: day ou week' })
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
