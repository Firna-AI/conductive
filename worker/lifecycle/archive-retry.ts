import type { ArchiveContext } from './archive-context'
import { scheduleArchiveRepair, type ArchiveResource } from './archive-data'
import { ARCHIVE_STATE_KEY } from './archive-types'
import { failedBackgroundRetry, type BackgroundRetry } from './background-retry'

/** Saves the next try, and moves the alarm and the repair timer to it. */
export async function scheduleArchiveRetry(
  context: ArchiveContext,
  row: ArchiveResource,
  error: unknown,
  attempt: BackgroundRetry,
): Promise<void> {
  const { env, dependencies, storage } = context
  const current = await storage.get('archive', ARCHIVE_STATE_KEY)
  const retry = failedBackgroundRetry(attempt, error, dependencies.now())
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
