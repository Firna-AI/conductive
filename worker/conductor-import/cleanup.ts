import type { AppEnv } from '../env'
import { workspaceBinding } from '../app-api/workspace-state'
import { requireFeatureResult } from '../features/result'
import { importServiceName } from './runtime'
import { dueImportCleanup, readImportCleanup } from './cleanup-data'

export async function cleanupImportWork(
  env: AppEnv,
  orgId: string,
  workspaceId: string,
) {
  const row = await readImportCleanup(env.DB, workspaceId)
  if (!row || row.orgId !== orgId) return
  const complete = await env.DB.prepare(
    `SELECT 1 FROM workspaces WHERE id = ? AND org_id = ?
    AND activation_completed_at IS NOT NULL`,
  )
    .bind(workspaceId, orgId)
    .first()
  if (!complete) return
  requireFeatureResult(
    await workspaceBinding(env)
      .getByName(importServiceName(workspaceId))
      .cleanupConductorImport({ orgId, reservationId: workspaceId }, 'work'),
  )
}

export async function purgeOrgImports(
  env: AppEnv,
  orgId: string,
  renew: () => Promise<void>,
) {
  let after = ''
  while (true) {
    const rows = (
      await env.DB.prepare(
        `SELECT reservation_id AS id FROM conductor_import_cleanup
      WHERE org_id = ? AND reservation_id > ? AND (group_name != 'all' OR finished_at IS NULL)
      ORDER BY reservation_id LIMIT 32`,
      )
        .bind(orgId, after)
        .all<{ id: string }>()
    ).results
    for (const row of rows) {
      await renew()
      const done = requireFeatureResult(
        await workspaceBinding(env)
          .getByName(importServiceName(row.id))
          .cleanupConductorImport({ orgId, reservationId: row.id }, 'all'),
      )
      if (!done) throw new Error('Import cleanup remains pending.')
      after = row.id
    }
    if (rows.length < 32) return
  }
}

export async function cleanupExpiredImports(env: AppEnv, now: number) {
  let after = ''
  const pending: string[] = []
  while (true) {
    const rows = await dueImportCleanup(env.DB, now, after)
    for (const row of rows) {
      try {
        const done = requireFeatureResult(
          await workspaceBinding(env)
            .getByName(importServiceName(row.reservationId))
            .cleanupConductorImport({
              orgId: row.orgId,
              reservationId: row.reservationId,
            }),
        )
        if (!done) pending.push(row.reservationId)
      } catch {
        pending.push(row.reservationId)
      }
      after = row.reservationId
    }
    if (rows.length < 32) return { pending }
  }
}
