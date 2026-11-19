import { ProviderError } from '../sandbox/errors'
import type { ArchiveContext } from './archive-context'
import { scheduleArchiveRepair, type ArchiveResource } from './archive-data'
import { ARCHIVE_STATE_KEY, type ArchiveRetry } from './archive-types'

/** The wait after the first failure. Each later failure doubles it. */
const FIRST_RETRY_MS = 30_000
/** The longest wait, also when the provider asks for a longer one. */
const LONGEST_RETRY_MS = 3_600_000

/**
 * Wait longer after each failure, and at least the provider's Retry-After.
 * A stuck sandbox then cannot use up the starts of the provider account.
 */
export function nextArchiveRetry(
  previous: ArchiveRetry | undefined,
  error: unknown,
  now: number,
): ArchiveRetry {
  const failures = (previous?.failures ?? 0) + 1
  const backoff = FIRST_RETRY_MS * 2 ** Math.min(failures - 1, 7)
  const retryAfter =
    error instanceof ProviderError && error.retryAfterSeconds !== null
      ? error.retryAfterSeconds * 1_000
      : 0
  return {
    failures,
    at: now + Math.min(LONGEST_RETRY_MS, Math.max(backoff, retryAfter)),
  }
}

/** Saves the next try, and moves the alarm and the repair timer to it. */
export async function scheduleArchiveRetry(
  context: ArchiveContext,
  row: ArchiveResource,
  error: unknown,
): Promise<void> {
  const { env, dependencies, storage } = context
  const current = await storage.get('archive', ARCHIVE_STATE_KEY)
  const retry = nextArchiveRetry(current?.retry, error, dependencies.now())
  if (current)
    await storage.put('archive', ARCHIVE_STATE_KEY, { ...current, retry })
  await storage.setAlarm(retry.at)
  try {
    // The repair Cron Trigger wakes an archive whose time in D1 is overdue.
    await scheduleArchiveRepair(env.DB, row, retry.at)
  } catch {
    /* The alarm keeps the retry time. A repair can then wake it early once. */
  }
}
