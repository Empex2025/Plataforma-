export const RECOMMENDATION_WEIGHTS = {
  textRelevance: 0.20,
  availability: 0.15,
  proximity: 0.15,
  price: 0.10,
  popularity: 0.15,
  rating: 0.10,
  recency: 0.05,
  onSale: 0.05,
  userAffinity: 0.05,
} as const;

export const EVENT_WEIGHTS = {
  view: 1,
  favorite: 3,
  contact: 5,
} as const;

export const RECOMMENDATION_THRESHOLDS = {
  nearbyDistance: 5000,
  highRating: 4.0,
  ratingMin: 1.0,
  priceRange: { min: 0, max: 1000 },
  recencyHalfLifeDays: 7,
  popularityHalfLifeDays: 30,
  userAffinityWindowDays: 30,
  minEventsForAffinity: 3,
  discountHigh: 20,
  discountMedium: 10,
} as const;

export const RECOMMENDATIONS_DEFAULT_LIMIT = 20;
export const RECOMMENDATIONS_MAX_LIMIT = 50;

export enum RecommendationReasonCode {
  NEARBY = 'NEARBY',
  HIGH_RATING = 'HIGH_RATING',
  POPULAR = 'POPULAR',
  AVAILABLE = 'AVAILABLE',
  ON_SALE = 'ON_SALE',
  RECENT = 'RECENT',
  BASED_ON_SEARCH = 'BASED_ON_SEARCH',
  BASED_ON_FAVORITES = 'BASED_ON_FAVORITES',
  SIMILAR_ITEM = 'SIMILAR_ITEM',
  CATEGORY_AFFINITY = 'CATEGORY_AFFINITY',
  HIGH_DISCOUNT = 'HIGH_DISCOUNT',
}

export const REASON_LABELS: Record<RecommendationReasonCode, string> = {
  [RecommendationReasonCode.NEARBY]: 'Perto de você',
  [RecommendationReasonCode.HIGH_RATING]: 'Bem avaliado',
  [RecommendationReasonCode.POPULAR]: 'Popular na região',
  [RecommendationReasonCode.AVAILABLE]: 'Disponível agora',
  [RecommendationReasonCode.ON_SALE]: 'Em oferta',
  [RecommendationReasonCode.RECENT]: 'Novidade',
  [RecommendationReasonCode.BASED_ON_SEARCH]: 'Baseado no que você pesquisou',
  [RecommendationReasonCode.BASED_ON_FAVORITES]: 'Você favoritou itens semelhantes',
  [RecommendationReasonCode.SIMILAR_ITEM]: 'Semelhante ao que você visualizou',
  [RecommendationReasonCode.CATEGORY_AFFINITY]: 'Categoria que você mais acessa',
  [RecommendationReasonCode.HIGH_DISCOUNT]: 'Desconto especial',
};
