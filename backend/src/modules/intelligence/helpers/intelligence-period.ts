import { MAX_RANGE_DAYS, DEFAULT_PERIOD_DAYS, type PeriodPreset } from '../intelligence.constants.js';

export interface ResolvedPeriod {
  start: Date;
  end: Date;
}

export function resolvePeriod(
  preset?: PeriodPreset,
  customStart?: string,
  customEnd?: string,
): ResolvedPeriod {
  const end = customEnd ? new Date(customEnd) : new Date();

  if (preset === 'today') {
    const start = new Date(end);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  if (preset === '7d') {
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { start, end };
  }

  if (preset === '30d') {
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start, end };
  }

  if (preset === 'custom') {
    if (!customStart) {
      const start = new Date(end.getTime() - DEFAULT_PERIOD_DAYS * 24 * 60 * 60 * 1000);
      return { start, end };
    }
    const start = new Date(customStart);
    const diffDays = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
    if (diffDays > MAX_RANGE_DAYS) {
      const clampedStart = new Date(end.getTime() - MAX_RANGE_DAYS * 24 * 60 * 60 * 1000);
      return { start: clampedStart, end };
    }
    return { start, end };
  }

  const start = customStart
    ? new Date(customStart)
    : new Date(end.getTime() - DEFAULT_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  return { start, end };
}
