import type { AppEnv } from '../env'
import { configuredDefaultChoice } from '../app-api/models'
import { sessionUser } from '../data/users'
import { importUnavailable, type ImportActor } from './access'
import type { ReservationRow } from './reservation-data'
import {
  readReservation,
  reservationWriteBindings,
  reservationWriteGuard,
} from './reservation-data'
import { importedWorkspaceStatements } from './workspace-data'

export async function completeReservation(
  env: AppEnv,
  actor: ImportActor,
  row: ReservationRow,
  now: number,
) {
  if (row.state === 'complete') return row.id
  if (!row.manifestClosed || !row.sourceFingerprint) throw importUnavailable()
  const user = await sessionUser(env.DB, actor.sessionId, now)
  if (!user || user.id !== row.importerUserId) throw importUnavailable()
  const guard = `EXISTS (SELECT 1 FROM conductor_import_reservations
    WHERE id = ? AND source_fingerprint = ? AND manifest_closed = 1 AND ${reservationWriteGuard()}
      AND NOT EXISTS (SELECT 1 FROM conductor_import_parts WHERE reservation_id = ? AND verified = 0)
      AND EXISTS (SELECT 1 FROM conductor_import_cleanup WHERE reservation_id = ? AND group_name = 'none' AND in_flight = 0))`
  const bindings = [
    row.id,
    row.sourceFingerprint,
    ...reservationWriteBindings(actor, now),
    row.id,
    row.id,
  ]
  const results = await env.DB.batch([
    ...importedWorkspaceStatements(
      env.DB,
      {
        id: row.id,
        orgId: row.orgId,
        importer: user,
        repositoryId: row.repositoryId,
        localWorkspaceId: row.localWorkspaceId,
        name: row.name,
        branch: row.branch,
        choice: configuredDefaultChoice(env),
        now,
      },
      guard,
      bindings,
    ),
    env.DB.prepare(
      `UPDATE conductor_import_reservations SET state = 'complete'
      WHERE id = ? AND ${guard} AND EXISTS (SELECT 1 FROM workspaces WHERE id = ? AND org_id = ?)
      AND EXISTS (SELECT 1 FROM workspace_runtime WHERE workspace_id = ?)`,
    ).bind(row.id, ...bindings, row.id, row.orgId, row.id),
    env.DB.prepare(
      `UPDATE conductor_import_cleanup SET due_at = NULL
      WHERE reservation_id = ? AND EXISTS (SELECT 1 FROM conductor_import_reservations WHERE id = ? AND state = 'complete')`,
    ).bind(row.id, row.id),
  ])
  if (
    !results[3].meta.changes ||
    (await readReservation(env.DB, row.id))?.state !== 'complete'
  )
    throw importUnavailable()
  return row.id
}
