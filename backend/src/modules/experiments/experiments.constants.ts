export const EXPERIMENT_DOMAINS = ['recommendation'] as const;
export const RECOMMENDATION_EXPERIMENT_DOMAIN = 'recommendation';

export const BUCKET_COUNT = 10000;
export const ALLOCATION_TOTAL = 100;

/**
 * How long an experiment definition is cached in memory for assignments.
 * Keeps assignment cheap (hash + in-memory config) without hitting the DB on
 * every request. Invalidated on any admin mutation.
 */
export const EXPERIMENT_CACHE_TTL_MS = 30000;

export const VARIANT_CONFIG_RECOMMENDATION_MODE = 'recommendation_mode';

/**
 * Events used to compute experiment metrics. Impressions/clicks are only
 * emitted while a recommendation experiment is RUNNING; the rest are reused
 * from the existing interaction events (attributed by subject membership).
 */
export const EXPERIMENT_METRIC_EVENT_TYPES = [
  'RECOMMENDATION_IMPRESSION',
  'RECOMMENDATION_CLICK',
  'PRODUCT_FAVORITE',
  'STORE_FAVORITE',
  'WHATSAPP_CLICK',
  'PHONE_CLICK',
] as const;

export const MAX_EXPERIMENT_VARIANTS = 10;
