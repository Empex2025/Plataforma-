import { zScoreForConfidence } from './normal.helpers.js';

export interface WilsonInterval {
  /** Point estimate (proportion in [0, 1]). */
  estimate: number;
  /** Lower bound (proportion in [0, 1]). */
  lower: number;
  /** Upper bound (proportion in [0, 1]). */
  upper: number;
}

/**
 * Wilson score interval for a binomial proportion.
 *
 *   center = (p + z^2 / 2n) / (1 + z^2 / n)
 *   margin = (z / (1 + z^2 / n)) * sqrt(p(1-p)/n + z^2 / 4n^2)
 *
 * Chosen over the normal (Wald) approximation because it behaves correctly for
 * small samples and for proportions near 0 or 1.
 *
 * Returns null when the sample size is not positive or the inputs are invalid.
 */
export function wilsonInterval(
  successes: number,
  total: number,
  confidenceLevel: number,
): WilsonInterval | null {
  if (!Number.isFinite(successes) || !Number.isFinite(total)) return null;
  if (total <= 0 || successes < 0) return null;

  const z = zScoreForConfidence(confidenceLevel);
  if (z === null) return null;

  const n = total;
  const p = Math.min(1, Math.max(0, successes / n));
  const z2 = z * z;
  const denominator = 1 + z2 / n;

  const center = (p + z2 / (2 * n)) / denominator;
  const margin = (z / denominator) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));

  const lower = Math.max(0, center - margin);
  const upper = Math.min(1, center + margin);

  if (![center, lower, upper].every((value) => Number.isFinite(value))) return null;

  return { estimate: p, lower, upper };
}
