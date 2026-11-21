import type { OpenProviderSwitch } from './provider-switch-data'
import { endedSwitchRepairStatements } from './provider-switch-repair-data'

export async function repairEndedProviderSwitch(
  db: D1Database,
  item: OpenProviderSwitch,
  now: number,
): Promise<boolean> {
  if (!item.buildId) return false
  const ended = await db
    .prepare(
      `SELECT id FROM image_builds
      WHERE id = ? AND org_id = ? AND operator_switch_id = ?
        AND state IN ('succeeded', 'failed')`,
    )
    .bind(item.buildId, item.orgId, item.id)
    .first<{ id: string }>()
  if (!ended) return false
  await db.batch(
    endedSwitchRepairStatements(db, item.orgId, now, {
      id: item.id,
      buildId: item.buildId,
    }),
  )
  return true
}
