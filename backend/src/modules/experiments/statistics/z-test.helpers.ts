import { normalCdf } from './normal.helpers.js';

export interface TwoProportionResult {
  z: number;
  pValue: number;
}

export function twoProportionZTest(
  controlSuccesses: number,
  controlTotal: number,
  treatmentSuccesses: number,
  treatmentTotal: number,
): TwoProportionResult | null {
  const inputs = [controlSuccesses, controlTotal, treatmentSuccesses, treatmentTotal];
  if (!inputs.every((value) => Number.isFinite(value))) return null;
  if (controlTotal <= 0 || treatmentTotal <= 0) return null;

  const pooled = (controlSuccesses + treatmentSuccesses) / (controlTotal + treatmentTotal);
  if (pooled <= 0 || pooled >= 1) return null;

  const standardError = Math.sqrt(pooled * (1 - pooled) * (1 / controlTotal + 1 / treatmentTotal));
  if (!Number.isFinite(standardError) || standardError === 0) return null;

  const controlRate = controlSuccesses / controlTotal;
  const treatmentRate = treatmentSuccesses / treatmentTotal;
  const z = (treatmentRate - controlRate) / standardError;

  const rawPValue = 2 * (1 - normalCdf(Math.abs(z)));
  if (!Number.isFinite(rawPValue)) return null;

  return { z, pValue: Math.min(1, Math.max(0, rawPValue)) };
}
