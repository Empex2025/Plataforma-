export function safeRatio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator <= 0) return null;

  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}

export function relativeLift(controlRate: number | null, treatmentRate: number | null): number | null {
  if (controlRate === null || treatmentRate === null) return null;
  if (!Number.isFinite(controlRate) || !Number.isFinite(treatmentRate)) return null;
  if (controlRate === 0) return null;

  const lift = (treatmentRate - controlRate) / controlRate;
  return Number.isFinite(lift) ? lift : null;
}
