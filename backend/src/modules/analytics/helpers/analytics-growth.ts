export interface GrowthComparison {
  absolute: number;
  percentage: number | null;
}

export function computeGrowth(current: number, previous: number): GrowthComparison {
  const absolute = current - previous;

  if (previous === 0) {
    return { absolute, percentage: current > 0 ? null : 0 };
  }

  const percentage = Math.round(((current - previous) / previous) * 100 * 100) / 100;
  return { absolute, percentage };
}

export function computeGrowthMap(
  current: Record<string, number>,
  previous: Record<string, number>,
): Record<string, GrowthComparison> {
  const result: Record<string, GrowthComparison> = {};
  const allKeys = new Set([...Object.keys(current), ...Object.keys(previous)]);

  for (const key of allKeys) {
    result[key] = computeGrowth(current[key] ?? 0, previous[key] ?? 0);
  }

  return result;
}
