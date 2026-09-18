import { ApiProperty } from '@nestjs/swagger';

const IMPRESSIONS_PER_MILLE = 1000;

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export class CampaignMetricsDto {
  @ApiProperty()
  campaignId!: string;

  @ApiProperty({ description: 'Total de impressões' })
  impressions!: number;

  @ApiProperty({ description: 'Total de cliques' })
  clicks!: number;

  @ApiProperty({ description: 'Taxa de cliques, em porcentagem (cliques / impressões * 100)' })
  ctr!: number;

  @ApiProperty({ description: 'Custo publicitário acumulado (monetário)' })
  spend!: number;

  @ApiProperty({
    description: 'Custo por clique (gasto / cliques). Nulo quando não há cliques.',
    nullable: true,
  })
  cpc!: number | null;

  @ApiProperty({
    description: 'Custo por mil (gasto / impressões * 1000). Nulo quando não há impressões.',
    nullable: true,
  })
  cpm!: number | null;

  @ApiProperty({ description: 'Conversões atribuídas (vendas)' })
  conversions!: number;

  @ApiProperty({ description: 'Receita atribuída (monetária)' })
  revenue!: number;

  @ApiProperty({
    description: 'Receita média por conversão (receita / conversões). Nula quando não há conversões.',
    nullable: true,
  })
  revenuePerConversion!: number | null;

  @ApiProperty({
    description: 'Taxa de conversão em porcentagem (conversões / cliques * 100). Nula quando não há cliques.',
    nullable: true,
  })
  conversionRate!: number | null;

  @ApiProperty({
    description: 'Retorno sobre o investimento em anúncios (receita / gasto). Nulo quando não há gasto.',
    nullable: true,
  })
  roas!: number | null;

  @ApiProperty({
    description: 'Retorno sobre o investimento ((receita - gasto) / gasto). Nulo quando não há gasto.',
    nullable: true,
  })
  roi!: number | null;

  @ApiProperty({ description: 'Número de dias com métricas registradas' })
  totalDays!: number;

  static fromAggregate(
    campaignId: string,
    impressions: number,
    clicks: number,
    totalDays: number,
    spend = 0,
    conversions = 0,
    revenue = 0,
  ): CampaignMetricsDto {
    const dto = new CampaignMetricsDto();
    dto.campaignId = campaignId;
    dto.impressions = impressions;
    dto.clicks = clicks;
    dto.ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    dto.spend = round(spend, 2);
    dto.cpc = clicks > 0 ? round(spend / clicks, 2) : null;
    dto.cpm = impressions > 0 ? round((spend / impressions) * IMPRESSIONS_PER_MILLE, 2) : null;
    dto.conversions = conversions;
    dto.revenue = round(revenue, 2);
    dto.revenuePerConversion = conversions > 0 ? round(revenue / conversions, 2) : null;
    dto.conversionRate = clicks > 0 ? round((conversions / clicks) * 100, 4) : null;
    dto.roas = spend > 0 ? round(revenue / spend, 4) : null;
    dto.roi = spend > 0 ? round((revenue - spend) / spend, 4) : null;
    dto.totalDays = totalDays;
    return dto;
  }
}
