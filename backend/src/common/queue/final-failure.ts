import type { Job } from 'bullmq';

/**
 * Returns true when a job has exhausted all of its configured attempts.
 * BullMQ emits `failed` on every attempt; this distinguishes the last one.
 */
export function isFinalAttempt(
  job: Pick<Job, 'attemptsMade' | 'opts'> | null | undefined,
): boolean {
  if (!job) return false;

  const configuredAttempts = job.opts?.attempts ?? 1;
  return job.attemptsMade >= configuredAttempts;
}
