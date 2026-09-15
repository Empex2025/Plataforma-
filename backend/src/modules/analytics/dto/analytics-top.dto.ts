import { GrowthComparison } from '../helpers/analytics-growth.js';

export class AnalyticsTopEntityDto {
  id!: string;
  name!: string;
  metric!: number;
  growth?: GrowthComparison;
}

export class AnalyticsTopCategoryDto {
  categoryId!: string;
  categoryName!: string;
  demand!: number;
  supply!: number;
}

export class AnalyticsTopEntitiesDto {
  period!: { start: string; end: string };
  items!: AnalyticsTopEntityDto[];
}
