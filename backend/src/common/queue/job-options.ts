import type { JobsOptions } from 'bullmq';

const MS = 1000;
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2 * MS },
  removeOnComplete: { age: DAY, count: 1000 },
  removeOnFail: { age: 7 * DAY, count: 5000 },
};
