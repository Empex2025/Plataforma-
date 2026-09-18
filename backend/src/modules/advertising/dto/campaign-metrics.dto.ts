import { ApiProperty } from '@nestjs/swagger';

const IMPRESSIONS_PER_MILLE = 1000;

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export class CampaignMetricsDto {
  @ApiProperty()
  campaignId!: string;

  @ApiProperty({ description: 'Total impressions' })
  impressions!: number;

  @ApiProperty({ description: 'Total clicks' })
  clicks!: number;

  @ApiProperty({ description: 'Click-through rate, in percent (clicks / impressions * 100)' })
  ctr!: number;

  @ApiProperty({ description: 'Accumulated advertising cost (monetary)' })
  spend!: number;

  @ApiProperty({
    description: 'Cost per click (spend / clicks). Null when there are no clicks.',
    nullable: true,
  })
  cpc!: number | null;

  @ApiProperty({
    description: 'Cost per mille (spend / impressions * 1000). Null when there are no impressions.',
    nullable: true,
  })
  cpm!: number | null;

  @ApiProperty({ description: 'Attributed conversions (sales)' })
  conversions!: number;

  @ApiProperty({ description: 'Attributed revenue (monetary)' })
  revenue!: number;

  @ApiProperty({
    description: 'Average revenue per conversion (revenue / conversions). Null when there are no conversions.',
    nullable: true,
  })
  revenuePerConversion!: number | null;

  @ApiProperty({
    description: 'Conversion rate in percent (conversions / clicks * 100). Null when there are no clicks.',
    nullable: true,
  })
  conversionRate!: number | null;

  @ApiProperty({
    description: 'Return on ad spend (revenue / spend). Null when there is no spend.',
    nullable: true,
  })
  roas!: number | null;

  @ApiProperty({
    description: 'Return on investment ((revenue - spend) / spend). Null when there is no spend.',
    nullable: true,
  })
  roi!: number | null;

  @ApiProperty({ description: 'Number of days with recorded metrics' })
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
