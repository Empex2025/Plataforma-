export class AnalyticsTimeseriesPointDto {
  date!: string;
  views!: number;
  favorites!: number;
  contacts!: number;
  reviews!: number;
  searches?: number;
}

export class AnalyticsTimeseriesDto {
  granularity!: 'day' | 'week';
  period!: { start: string; end: string };
  series!: AnalyticsTimeseriesPointDto[];
}
