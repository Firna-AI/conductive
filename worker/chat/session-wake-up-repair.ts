import type { AppEnv } from '../env'
import type { ReceiverStorage } from '../members/receiver-storage'

export const wakeUpRepairReceiver = 'repair:session-wake-ups'
const cursorKey = 'session-wake-up-repair:after'
const batchSize = 32

/**
 * An older Worker can restore an org without rearming a wake-up source that
 * its delete removed. Visit only restored orgs, and keep the scan bounded.
 */
export async function repairRestoredWakeUpAlarms(
  env: AppEnv,
  storage: ReceiverStorage,
): Promise<void> {
  const workspaces = env.WORKSPACES
  if (!workspaces) return
  const after = (await storage.get<string>(cursorKey)) ?? ''
  const { results } = await env.DB.prepare(
    `SELECT w.id FROM workspaces w JOIN orgs o ON o.id = w.org_id
     WHERE w.id > ? AND o.lifecycle_generation > 0 AND
     o.deleted_at IS NULL AND o.suspended_at IS NULL ORDER BY w.id LIMIT ?`,
  )
    .bind(after, batchSize)
    .all<{ id: string }>()
  const settled = await Promise.allSettled(
    results.map(({ id }) =>
      workspaces.getByName(id).repairSessionWakeUpAlarm(id),
    ),
  )
  const last = results.at(-1)
  if (last && results.length === batchSize)
    await storage.put(cursorKey, last.id)
  else await storage.delete(cursorKey)
  const failure = settled.find((result) => result.status === 'rejected')
  if (failure) throw failure.reason
}
