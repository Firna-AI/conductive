import type { QueueScope } from './contracts'

export const QUEUE_SCOPE_KEY = 'merge-queue:scope'

export async function saveQueueAlarm(
  storage: DurableObjectTransaction,
  { orgId, githubRepositoryId }: QueueScope,
  at: number,
): Promise<void> {
  await storage.put(QUEUE_SCOPE_KEY, { orgId, githubRepositoryId })
  const earlier = await storage.getAlarm()
  at = Math.max(1, at)
  if (earlier === null || earlier > at) await storage.setAlarm(at)
}

type QueueRetry = { waitFor: string; at: number; delay: number }

/** A wake before the saved time can check the condition without growing the delay. */
export function saveQueueRetry(
  storage: DurableObjectStorage,
  scope: QueueScope,
  wait: 'local-work' | 'stack-cleanup',
  now: number,
  waitFor?: string,
) {
  const key = `merge-queue:retry:${wait}`
  return storage.transaction(async (transaction) => {
    const previous = await transaction.get<QueueRetry>(key)
    if (waitFor === undefined) {
      if (previous) await transaction.delete(key)
      return
    }
    if (previous?.waitFor === waitFor && previous.at > now) {
      await saveQueueAlarm(transaction, scope, previous.at)
      return
    }
    const delay =
      previous?.waitFor === waitFor
        ? Math.min(previous.delay * 2, 15 * 60_000)
        : 30_000
    const retry = { waitFor, delay, at: now + delay }
    await transaction.put(key, retry)
    await saveQueueAlarm(transaction, scope, retry.at)
  })
}
