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
