const MIN_ATTEMPTS = 60;
const MAX_ATTEMPTS = 300;

export function restartPollAttempts(estimatedSeconds?: number): number {
  if (!Number.isFinite(estimatedSeconds) || (estimatedSeconds as number) <= 0) return MIN_ATTEMPTS;
  return Math.min(MAX_ATTEMPTS, Math.max(MIN_ATTEMPTS, Math.ceil((estimatedSeconds as number) * 2)));
}
