export class AnalyticsRegionDto {
  city!: string;
  state!: string;
  count!: number;
}

export class AnalyticsRegionsDto {
  period!: { start: string; end: string };
  regions!: AnalyticsRegionDto[];
}
