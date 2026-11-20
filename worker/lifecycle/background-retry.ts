import { ProviderError } from '../sandbox/errors'

/** Consecutive unresolved attempts and the next provider attempt time. */
export interface BackgroundRetry {
  failures: number
  at: number
}

function retryForFailure(
  failures: number,
  error: unknown,
  now: number,
): BackgroundRetry {
  const backoff = 30_000 * 2 ** Math.min(failures - 1, 7)
  const retryAfter =
    error instanceof ProviderError && error.retryAfterSeconds !== null
      ? error.retryAfterSeconds * 1_000
      : 0
  return {
    failures,
    at: now + Math.min(3_600_000, Math.max(backoff, retryAfter)),
  }
}

/** Save before provider work, so recovery observes the same growing wait. */
export function nextBackgroundRetry(
  previous: BackgroundRetry | undefined,
  now: number,
): BackgroundRetry {
  return retryForFailure((previous?.failures ?? 0) + 1, undefined, now)
}

/** Apply Retry-After without counting an in-flight attempt twice. */
export function failedBackgroundRetry(
  attempt: BackgroundRetry,
  error: unknown,
  now: number,
): BackgroundRetry {
  return retryForFailure(attempt.failures, error, now)
}
