import { GrowthComparison } from '../helpers/analytics-growth.js';
import { AnalyticsAdvertisingDto } from './analytics-advertising.dto.js';

export class AnalyticsTotalsDto {
  views!: number;
  favorites!: number;
  contacts!: number;
  reviews!: number;
  searches!: number;
  whatsappClicks!: number;
  phoneClicks!: number;
  routeRequests!: number;
}

export class AnalyticsPeriodDto {
  start!: string;
  end!: string;
  previousStart!: string;
  previousEnd!: string;
}

export class AnalyticsOverviewDto {
  period!: AnalyticsPeriodDto;
  totals!: AnalyticsTotalsDto;
  previousTotals!: AnalyticsTotalsDto;
  growth!: Record<string, GrowthComparison>;
  advertising?: AnalyticsAdvertisingDto;
}
