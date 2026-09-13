export const HEURISTIC_DISCLAIMER = 'HEURISTICO_NAO_DEFINITIVO' as const;

export const TOP_N = 10;
export const MAX_RANGE_DAYS = 90;
export const DEFAULT_PERIOD_DAYS = 30;

export type PeriodPreset = 'today' | '7d' | '30d' | 'custom';
export const VALID_PERIOD_PRESETS: readonly PeriodPreset[] = ['today', '7d', '30d', 'custom'];

export const PRODUCT_EVENT_TYPES = [
  'PRODUCT_VIEW',
  'PRODUCT_FAVORITE',
  'REVIEW_CREATED',
  'REVIEW_APPROVED',
  'REVIEW_REJECTED',
] as const;

export const STORE_EVENT_TYPES = [
  'STORE_VIEW',
  'STORE_FAVORITE',
  'WHATSAPP_CLICK',
  'PHONE_CLICK',
  'REVIEW_CREATED',
  'REVIEW_APPROVED',
  'REVIEW_REJECTED',
] as const;

export const ALL_ATTRIBUTABLE_EVENT_TYPES = [
  'PRODUCT_VIEW',
  'STORE_VIEW',
  'PRODUCT_FAVORITE',
  'STORE_FAVORITE',
  'WHATSAPP_CLICK',
  'PHONE_CLICK',
  'REVIEW_CREATED',
  'REVIEW_APPROVED',
  'REVIEW_REJECTED',
  'ALERT_CREATED',
] as const;

export const DEMAND_GAP_THRESHOLDS = {
  minDemand: 5,
  maxSupply: 3,
} as const;

export const TIMESERIES_MAX_RANGE_DAYS = 90;
export const TIMESERIES_ALLOWED_GRANULARITIES = ['day', 'week'] as const;
