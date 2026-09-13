import { ApiProperty } from '@nestjs/swagger';

export class CampaignMetricsDto {
  @ApiProperty()
  campaignId!: string;

  @ApiProperty()
  impressions!: number;

  @ApiProperty()
  clicks!: number;

  @ApiProperty()
  ctr!: number;

  @ApiProperty()
  totalDays!: number;

  static fromAggregate(
    campaignId: string,
    impressions: number,
    clicks: number,
    totalDays: number,
  ): CampaignMetricsDto {
    const dto = new CampaignMetricsDto();
    dto.campaignId = campaignId;
    dto.impressions = impressions;
    dto.clicks = clicks;
    dto.ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    dto.totalDays = totalDays;
    return dto;
  }
}
