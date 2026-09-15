import { RECOMMENDATION_WEIGHTS } from '../recommendations.constants.js';

export interface RecommendationSignalScores {
  textRelevance: number;
  availability: number;
  proximity: number;
  price: number;
  popularity: number;
  rating: number;
  recency: number;
  onSale: number;
  userAffinity: number;
}

export function computeRecommendationScore(signals: RecommendationSignalScores): number {
  const hasUserAffinity = signals.userAffinity > 0;

  if (!hasUserAffinity) {
    const totalOtherWeight = Object.entries(RECOMMENDATION_WEIGHTS)
      .filter(([k]) => k !== 'userAffinity')
      .reduce((sum, [, v]) => sum + v, 0);

    const redistributionFactor = totalOtherWeight > 0 ? 1 / totalOtherWeight : 0;

    return Object.entries(signals)
      .filter(([k]) => k !== 'userAffinity')
      .reduce((score, [key, value]) => {
        const weight = RECOMMENDATION_WEIGHTS[key as keyof typeof RECOMMENDATION_WEIGHTS] ?? 0;
        return score + value * weight * redistributionFactor;
      }, 0);
  }

  return Object.entries(signals).reduce((score, [key, value]) => {
    const weight = RECOMMENDATION_WEIGHTS[key as keyof typeof RECOMMENDATION_WEIGHTS] ?? 0;
    return score + value * weight;
  }, 0);
}

export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export function invertNormalize(value: number, min: number, max: number): number {
  return 1 - normalize(value, min, max);
}

export function decayByDays(daysSince: number, halfLife: number): number {
  if (halfLife <= 0) return 0;
  return Math.pow(0.5, daysSince / halfLife);
}
