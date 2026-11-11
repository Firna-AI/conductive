import type {
  ImportReservation,
  ImportScanRow,
} from '../../src/shared/conductor-import-operation.ts'
import {
  importAccessBindings,
  importPermission,
  type ImportActor,
} from './access'

export const IMPORT_RESERVATION_MS = 7 * 24 * 60 * 60 * 1000

export interface ReservationRow {
  id: string
  orgId: string
  importerUserId: string
  repositoryId: string
  localWorkspaceId: string
  name: string
  branch: string
  state: 'open' | 'complete' | 'superseded' | 'expired' | 'deleting'
  createdAt: number
  expiresAt: number
  sourceFingerprint: string | null
  snapshotJson: string | null
  manifestCount: number
  manifestClosed: number
  storedBytes: number
}

const columns = `id, org_id AS orgId, importer_user_id AS importerUserId,
  repository_id AS repositoryId, local_workspace_id AS localWorkspaceId,
  name, branch, state, created_at AS createdAt, expires_at AS expiresAt,
  source_fingerprint AS sourceFingerprint, snapshot_json AS snapshotJson,
  manifest_count AS manifestCount, manifest_closed AS manifestClosed, stored_bytes AS storedBytes`

export function readReservation(db: D1Database, id: string) {
  return db
    .prepare(
      `SELECT ${columns} FROM conductor_import_reservations WHERE id = ?`,
    )
    .bind(id)
    .first<ReservationRow>()
}

export function activeReservation(
  db: D1Database,
  orgId: string,
  localId: string,
) {
  return db
    .prepare(
      `SELECT ${columns} FROM conductor_import_reservations
    WHERE org_id = ? AND local_workspace_id = ? AND state IN ('open','complete')`,
    )
    .bind(orgId, localId)
    .first<ReservationRow>()
}

export function reservationView(row: ReservationRow): ImportReservation {
  return {
    id: row.id,
    localWorkspaceId: row.localWorkspaceId,
    sourceFingerprint: row.sourceFingerprint,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    storedBytes: row.storedBytes,
    workspaceId: row.state === 'complete' ? row.id : null,
  }
}

export async function createReservation(
  db: D1Database,
  actor: ImportActor,
  id: string,
  repositoryId: string,
  source: ImportScanRow,
  now: number,
  replace?: { reservationId: string; sourceFingerprint: string | null },
) {
  const access = importAccessBindings(actor, now)
  const replacement = replace
    ? [
        db
          .prepare(
            `UPDATE conductor_import_reservations
    SET state = 'superseded', replacement_id = ? WHERE id = ? AND org_id = ?
      AND importer_user_id = ? AND local_workspace_id = ? AND state = 'open'
      AND expires_at > ? AND source_fingerprint IS ? AND ${importPermission}`,
          )
          .bind(
            id,
            replace.reservationId,
            actor.orgId,
            actor.userId,
            source.localWorkspaceId,
            now,
            replace.sourceFingerprint,
            ...access,
          ),
      ]
    : []
  const replacementGuard = replace
    ? `AND EXISTS (SELECT 1 FROM conductor_import_reservations WHERE id = ? AND replacement_id = ?)`
    : ''
  await db.batch([
    db
      .prepare(
        `UPDATE conductor_import_reservations SET state = 'expired'
      WHERE org_id = ? AND local_workspace_id = ? AND state = 'open' AND expires_at <= ? AND ${importPermission}`,
      )
      .bind(actor.orgId, source.localWorkspaceId, now, ...access),
    db
      .prepare(
        `UPDATE conductor_import_cleanup SET group_name = 'all',due_at = ?
      WHERE reservation_id IN (SELECT id FROM conductor_import_reservations
        WHERE org_id = ? AND local_workspace_id = ? AND state = 'expired')
      AND finished_at IS NULL AND ${importPermission}`,
      )
      .bind(now, actor.orgId, source.localWorkspaceId, ...access),
    ...replacement,
    db
      .prepare(
        `INSERT OR IGNORE INTO conductor_import_reservations
      (id,org_id,importer_user_id,repository_id,local_workspace_id,name,branch,created_at,expires_at)
      SELECT ?,?,?,?,?,?,?,?,? WHERE ${importPermission}
        AND EXISTS (SELECT 1 FROM repositories WHERE id = ? AND org_id = ? AND selected = 1)
        AND NOT EXISTS (SELECT 1 FROM workspaces WHERE org_id = ? AND conductor_local_id = ?)
        ${replacementGuard}`,
      )
      .bind(
        id,
        actor.orgId,
        actor.userId,
        repositoryId,
        source.localWorkspaceId,
        source.name,
        source.branch,
        now,
        now + IMPORT_RESERVATION_MS,
        ...access,
        repositoryId,
        actor.orgId,
        actor.orgId,
        source.localWorkspaceId,
        ...(replace ? [replace.reservationId, id] : []),
      ),
    db
      .prepare(
        `INSERT OR IGNORE INTO conductor_import_cleanup
      (reservation_id,org_id,latest_target_at,due_at)
      SELECT id,org_id,created_at,expires_at FROM conductor_import_reservations WHERE id = ?`,
      )
      .bind(id),
    ...(replace
      ? [
          db
            .prepare(
              `UPDATE conductor_import_cleanup SET group_name = 'all', due_at = ?,
      finished_at = NULL WHERE reservation_id = ? AND EXISTS (
        SELECT 1 FROM conductor_import_reservations WHERE id = ? AND replacement_id = ?)`,
            )
            .bind(now, replace.reservationId, replace.reservationId, id),
        ]
      : []),
  ])
  return activeReservation(db, actor.orgId, source.localWorkspaceId)
}

export function reservationWriteGuard() {
  return `state = 'open' AND expires_at > ? AND org_id = ? AND importer_user_id = ? AND ${importPermission}
    AND EXISTS (SELECT 1 FROM repositories chosen
      LEFT JOIN github_installations installation ON installation.id = chosen.installation_id
      WHERE chosen.id = conductor_import_reservations.repository_id
        AND chosen.org_id = conductor_import_reservations.org_id AND chosen.selected = 1
        AND (chosen.installation_id IS NULL OR (installation.id IS NOT NULL AND installation.suspended_at IS NULL)))`
}

export const reservationWriteBindings = (actor: ImportActor, now: number) => [
  now,
  actor.orgId,
  actor.userId,
  ...importAccessBindings(actor, now),
]
