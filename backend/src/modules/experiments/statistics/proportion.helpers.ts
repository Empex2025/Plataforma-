/**
 * Division that never yields NaN/Infinity: returns null when the denominator is
 * not positive or any operand is not finite.
 */
export function safeRatio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator <= 0) return null;

  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}

/**
 * Relative lift as a fraction: (treatment - control) / control.
 *
 * Returns null when the control rate is zero (undefined lift) or any input is
 * invalid. Never returns Infinity/NaN.
 */
export function relativeLift(controlRate: number | null, treatmentRate: number | null): number | null {
  if (controlRate === null || treatmentRate === null) return null;
  if (!Number.isFinite(controlRate) || !Number.isFinite(treatmentRate)) return null;
  if (controlRate === 0) return null;

  const lift = (treatmentRate - controlRate) / controlRate;
  return Number.isFinite(lift) ? lift : null;
}
