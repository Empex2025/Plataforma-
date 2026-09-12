import { ApiProperty } from '@nestjs/swagger';
import { TopEntityDto, DemandGapHeuristicDto } from './company-intelligence.dto.js';

export class PlatformTotalsDto {
  @ApiProperty({ description: 'Total de eventos no período' })
  totalEvents!: number;

  @ApiProperty({ description: 'Total de visualizações de produtos' })
  totalViews!: number;

  @ApiProperty({ description: 'Total de cliques em contato (WhatsApp/telefone)' })
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
    type: DemandGapHeuristicDto,
    description:
      'Sinais heurísticos globais de oportunidade no funil. G1 + G3 = Demand Gap. NÃO representam demanda real ou comprovada.',
  })
  demandGap!: DemandGapHeuristicDto;

  @ApiProperty({ type: PlatformTotalsDto, description: 'Totais gerais da plataforma' })
  totals!: PlatformTotalsDto;

  @ApiProperty()
  periodStart!: Date;

  @ApiProperty()
  periodEnd!: Date;
}
