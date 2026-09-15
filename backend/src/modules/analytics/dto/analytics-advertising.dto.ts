export class AnalyticsCampaignDto {
  id!: string;
  name!: string;
  status!: string;
  impressions!: number;
  clicks!: number;
  ctr!: number;
}

export class AnalyticsAdvertisingDto {
  period!: { start: string; end: string };
  totals!: { impressions: number; clicks: number; ctr: number };
  campaigns!: AnalyticsCampaignDto[];
}
