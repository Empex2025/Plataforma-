import { DISCOVERY_WEIGHTS } from '../discovery.constants.js';

export interface SignalScores {
  textRelevance: number;
  availability: number;
  proximity: number;
  price: number;
  popularity: number;
  rating: number;
  recency: number;
}

export function computeRankingScore(signals: SignalScores): number {
  return (
    signals.textRelevance * DISCOVERY_WEIGHTS.textRelevance +
    signals.availability * DISCOVERY_WEIGHTS.availability +
    signals.proximity * DISCOVERY_WEIGHTS.proximity +
    signals.price * DISCOVERY_WEIGHTS.price +
    signals.popularity * DISCOVERY_WEIGHTS.popularity +
    signals.rating * DISCOVERY_WEIGHTS.rating +
    signals.recency * DISCOVERY_WEIGHTS.recency
  );
}

export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export function invertNormalize(value: number, min: number, max: number): number {
  return 1 - normalize(value, min, max);
}

export function decayByDays(daysSince: number, halfLife: number): number {
  return Math.pow(0.5, daysSince / halfLife);
}
