import {
  failedBackgroundRetry,
  nextBackgroundRetry,
  type BackgroundRetry,
} from './background-retry'
import type { WorkspaceStorage } from './platform-storage'

export async function beginBackgroundAttempt(
  storage: WorkspaceStorage,
  key: string,
  now: number,
): Promise<{ retry: BackgroundRetry; ready: boolean }> {
  return storage.transaction(async (transaction) => {
    const previous = await transaction.get('retry', key)
    const ready = previous === undefined || previous.at <= now
    const retry = ready ? nextBackgroundRetry(previous, now) : previous
    if (ready) await transaction.put('retry', key, retry)
    await transaction.setAlarm(retry.at)
    return { retry, ready }
  })
}

export async function failBackgroundAttempt(
  storage: WorkspaceStorage,
  key: string,
  attempt: BackgroundRetry,
  error: unknown,
  now: number,
): Promise<BackgroundRetry> {
  const retry = failedBackgroundRetry(attempt, error, now)
  await storage.transaction(async (transaction) => {
    await transaction.put('retry', key, retry)
    await transaction.setAlarm(retry.at)
  })
  return retry
}
