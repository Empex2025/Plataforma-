import { ApiProperty } from '@nestjs/swagger';

export class TopEntityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  count!: number;

  @ApiProperty()
  revenue?: number;
}

export class DemandGapHeuristicDto {
  @ApiProperty({
    description:
      'Sinal heurístico G1: Gap de busca → visualização. Mede buscas que não se converteram em visualizações de produtos. Valor alto pode indicar oportunidade de expansão do catálogo. NÃO representa demanda real ou comprovada.',
  })
  g1!: number;

  @ApiProperty({
    description:
      'Sinal heurístico G3: Gap de visualização → contato. Mede visualizações de produto que não se converteram em cliques de contato. Valor alto pode indicar oportunidade de otimização do anúncio. NÃO representa demanda real ou comprovada.',
  })
  g3!: number;

  @ApiProperty({
    description:
      'Demand Gap = G1 + G3. Sinal heurístico agregado de oportunidades perdidas no funil. NÃO é uma medição definitiva de demanda. Use apenas como indicador de priorização.',
  })
  demandGap!: number;

  @ApiProperty({
    description:
      'Total de visualizações de produtos (PRODUCT_VIEW) no período. Usado na composição do G3.',
  })
  totalViews!: number;

  @ApiProperty({
    description:
      'Total de cliques em contato (WHATSAPP_CLICK + PHONE_CLICK) no período. Usado na composição do G3.',
  })
  totalContacts!: number;

  @ApiProperty({
    description: 'Taxa de conversão bruta (totalContacts / totalViews * 100).',
  })
  conversionRate!: number;

  @ApiProperty({
    description:
      'Quantidade estimada de buscas relevantes no período. Usado na composição do G1. Heurística: contagem de buscas feitas por usuários/sessões que também visualizaram produtos da empresa.',
  })
  totalSearches!: number;

  @ApiProperty({
    description:
      'Aviso explícito: G1, G3 e Demand Gap são sinais heurísticos de oportunidade, NÃO representam demanda real ou comprovada. Não usar como métrica definitiva.',
    enum: ['HEURISTICO_NAO_DEFINITIVO'],
    default: 'HEURISTICO_NAO_DEFINITIVO',
  })
  heuristicDisclaimer!: 'HEURISTICO_NAO_DEFINITIVO';
}

export class CompanyIntelligenceDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty({ type: [TopEntityDto] })
  topProducts!: TopEntityDto[];

  @ApiProperty({ type: [TopEntityDto] })
  topStores!: TopEntityDto[];

  @ApiProperty({ type: DemandGapHeuristicDto })
  demandGap!: DemandGapHeuristicDto;

  @ApiProperty()
  periodStart!: Date;

  @ApiProperty()
  periodEnd!: Date;
}
