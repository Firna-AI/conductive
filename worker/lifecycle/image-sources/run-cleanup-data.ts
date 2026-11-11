import type { LifecycleOwnership } from '../../members/lifecycle-contract'
import { sourceCleanupFence } from './cleanup-data'

export async function invalidateSourceRun(
  db: D1Database,
  buildId: string,
  ownership?: LifecycleOwnership,
) {
  const fence = sourceCleanupFence('image_source_runs', ownership)
  const result = await db
    .prepare(
      `UPDATE image_source_runs SET phase = 'abort', failed = 1 WHERE build_id = ?${fence.sql}`,
    )
    .bind(buildId, ...fence.values)
    .run()
  if (ownership && !result.meta.changes)
    throw new Error('Image cleanup ownership changed')
}

export async function deleteSourceRun(
  db: D1Database,
  buildId: string,
  ownership?: LifecycleOwnership,
) {
  const fence = sourceCleanupFence('image_source_runs', ownership)
  await db
    .prepare(`DELETE FROM image_source_runs WHERE build_id = ?${fence.sql}`)
    .bind(buildId, ...fence.values)
    .run()
}

export async function orgSourceBuildIds(db: D1Database, orgId: string) {
  return (
    await db
      .prepare(
        `SELECT build_id AS buildId FROM image_source_jobs WHERE org_id = ?
     UNION SELECT build_id AS buildId FROM image_source_runs WHERE org_id = ?`,
      )
      .bind(orgId, orgId)
      .all<{ buildId: string }>()
  ).results.map((row) => row.buildId)
}
