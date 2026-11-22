import { activeWorkspace } from '../github/data'
import type { BaseChangeJob } from './base-change-job'

export async function repositoryDefaultBinding(
  db: D1Database,
  job: BaseChangeJob,
) {
  const current = await activeWorkspace(db, job.binding.id, job.binding.orgId)
  return current?.repositoryId === job.binding.repositoryId &&
    current.branch === job.binding.branch &&
    current.baseBranch == null
    ? current
    : null
}

/** A missing receipt also fences every later write of its sync attempt. */
export async function unfinishedRepositoryDeliveries(
  db: D1Database,
  ids: readonly string[],
) {
  if (ids.length === 0) return []
  const { results } = await db
    .prepare(
      `SELECT delivery_id AS id FROM github_webhook_deliveries
     WHERE delivery_id IN (SELECT value FROM json_each(?)) AND processed_at IS NULL`,
    )
    .bind(JSON.stringify(ids))
    .all<{ id: string }>()
  const open = new Set(results.map(({ id }) => id))
  return ids.filter((id) => open.has(id))
}

/** A rejected save must prepare again under a fresh receipt before writing. */
export async function closeRepositoryDefaultWrites(
  db: D1Database,
  ids: readonly string[],
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE github_webhook_deliveries SET processed_at = ?
       WHERE delivery_id IN (SELECT value FROM json_each(?)) AND processed_at IS NULL`,
    )
    .bind(now, JSON.stringify(ids))
    .run()
}
