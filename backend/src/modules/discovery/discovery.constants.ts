export const DISCOVERY_WEIGHTS = {
  textRelevance: 0.25,
  availability: 0.20,
  proximity: 0.20,
  price: 0.10,
  popularity: 0.10,
  rating: 0.10,
  recency: 0.05,
};

export const DISCOVERY_THRESHOLDS = {
  trendingMinViews: 3,
  trendingPeriodDays: 7,
  newItemsPeriodDays: 7,
  nearbyDefaultRadius: 10000,
  nearbyMaxRadius: 50000,
  ratingHigh: 4.0,
  ratingMin: 1.0,
  popularityHigh: 10,
  recencyNewDays: 7,
};

export const REASON_THRESHOLDS = {
  nearDistance: 5000,
  highRating: 4.0,
  inStock: true,
  hasOffer: true,
  popularViews: 10,
  newDays: 7,
};

export const DISCOVERY_DEFAULT_PAGE_LIMIT = 20;
export const DISCOVERY_MAX_PAGE_LIMIT = 50;
