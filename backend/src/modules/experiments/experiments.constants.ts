export const EXPERIMENT_DOMAINS = ['recommendation'] as const;
export const RECOMMENDATION_EXPERIMENT_DOMAIN = 'recommendation';

export const BUCKET_COUNT = 10000;
export const ALLOCATION_TOTAL = 100;

export const EXPERIMENT_CACHE_TTL_MS = 30000;

export const VARIANT_CONFIG_RECOMMENDATION_MODE = 'recommendation_mode';

export const EXPERIMENT_METRIC_EVENT_TYPES = [
  'RECOMMENDATION_IMPRESSION',
  'RECOMMENDATION_CLICK',
  'PRODUCT_FAVORITE',
  'STORE_FAVORITE',
  'WHATSAPP_CLICK',
  'PHONE_CLICK',
] as const;

export const MAX_EXPERIMENT_VARIANTS = 10;
