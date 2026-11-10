import type { ImportActor } from './access'
import {
  reservationWriteBindings,
  reservationWriteGuard,
} from './reservation-data'

export interface ImportCleanupRow {
  reservationId: string
  orgId: string
  group: 'none' | 'work' | 'all'
  latestTargetAt: number
  dueAt: number | null
  firstDeletedAt: number | null
  finishedAt: number | null
  inFlight: number
}

const columns = `reservation_id AS reservationId,org_id AS orgId,group_name AS 'group',
  latest_target_at AS latestTargetAt,due_at AS dueAt,first_deleted_at AS firstDeletedAt,
  finished_at AS finishedAt,in_flight AS inFlight`

export function readImportCleanup(db: D1Database, id: string) {
  return db
    .prepare(
      `SELECT ${columns} FROM conductor_import_cleanup WHERE reservation_id = ?`,
    )
    .bind(id)
    .first<ImportCleanupRow>()
}

export async function requestImportCleanup(
  db: D1Database,
  id: string,
  group: 'work' | 'all',
  now: number,
) {
  await db.batch([
    db
      .prepare(
        `UPDATE conductor_import_reservations SET state = CASE
      WHEN state = 'open' AND expires_at <= ? THEN 'expired'
      WHEN state = 'open' THEN 'deleting' ELSE state END
      WHERE id = ? AND ? = 'all'`,
      )
      .bind(now, id, group),
    db
      .prepare(
        `UPDATE conductor_import_cleanup SET
      first_deleted_at = CASE WHEN group_name != 'all' AND ? = 'all' THEN NULL ELSE first_deleted_at END,
      finished_at = CASE WHEN group_name != 'all' AND ? = 'all' THEN NULL ELSE finished_at END,
      group_name = CASE WHEN group_name = 'all' OR ? = 'all' THEN 'all' ELSE 'work' END,
      due_at = CASE WHEN finished_at IS NULL OR (group_name != 'all' AND ? = 'all') THEN ? ELSE due_at END
      WHERE reservation_id = ?`,
      )
      .bind(group, group, group, group, now, id),
  ])
}

export async function beginImportWrite(
  db: D1Database,
  id: string,
  identity: import('../../src/shared/conductor-import-storage.ts').ImportUploadIdentity,
  actor: ImportActor,
  now: number,
) {
  const result = await db
    .prepare(
      `UPDATE conductor_import_cleanup SET in_flight = in_flight + 1,pending_write_json = ?
    WHERE reservation_id = ? AND group_name = 'none' AND in_flight = 0 AND EXISTS (
      SELECT 1 FROM conductor_import_reservations WHERE id = ? AND ${reservationWriteGuard()})`,
    )
    .bind(
      JSON.stringify(identity),
      id,
      id,
      ...reservationWriteBindings(actor, now),
    )
    .run()
  return result.meta.changes > 0
}

export async function endImportWrite(db: D1Database, id: string) {
  await db
    .prepare(
      `UPDATE conductor_import_cleanup SET in_flight = MAX(0,in_flight - 1),pending_write_json = NULL WHERE reservation_id = ?`,
    )
    .bind(id)
    .run()
}

export async function markImportDeletion(
  db: D1Database,
  id: string,
  now: number,
  next: number | null,
) {
  await db
    .prepare(
      `UPDATE conductor_import_cleanup SET first_deleted_at = COALESCE(first_deleted_at,?),
    finished_at = CASE WHEN ? IS NULL THEN ? ELSE NULL END,due_at = ?
    WHERE reservation_id = ? AND in_flight = 0`,
    )
    .bind(now, next, now, next, id)
    .run()
  if (next === null)
    await db
      .prepare(
        `DELETE FROM conductor_import_reservations
    WHERE id = ? AND state IN ('expired','superseded','deleting') AND EXISTS (
      SELECT 1 FROM conductor_import_cleanup WHERE reservation_id = ? AND finished_at IS NOT NULL AND in_flight = 0)`,
      )
      .bind(id, id)
      .run()
}

export async function dueImportCleanup(
  db: D1Database,
  now: number,
  after = '',
) {
  return (
    await db
      .prepare(
        `SELECT ${columns} FROM conductor_import_cleanup
    WHERE reservation_id > ? AND ((finished_at IS NULL AND (due_at <= ? OR NOT EXISTS (
      SELECT 1 FROM orgs WHERE id = conductor_import_cleanup.org_id))) OR
      (group_name != 'all' AND NOT EXISTS (SELECT 1 FROM orgs WHERE id = conductor_import_cleanup.org_id)))
    ORDER BY reservation_id LIMIT 32`,
      )
      .bind(after, now)
      .all<ImportCleanupRow>()
  ).results
}
