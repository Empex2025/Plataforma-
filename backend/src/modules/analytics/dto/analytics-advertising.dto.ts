export class AnalyticsCampaignDto {
  id!: string;
  name!: string;
  status!: string;
  impressions!: number;
  clicks!: number;
  ctr!: number;
  spend!: number;
  conversions!: number;
  revenue!: number;
  roas!: number | null;
}

export class AnalyticsAdvertisingDto {
  period!: { start: string; end: string };
  totals!: {
    impressions: number;
    clicks: number;
    ctr: number;
    spend: number;
    conversions: number;
    revenue: number;
    roas: number | null;
  };
  campaigns!: AnalyticsCampaignDto[];
}
