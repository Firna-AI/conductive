import type {
  ImportManifestEntry,
  ImportManifestPage,
  ImportSnapshot,
} from '../../src/shared/conductor-import-manifest.ts'
import { readImportManifestEntry } from '../../src/shared/conductor-import-manifest-read.ts'
import { importPage } from '../../src/shared/conductor-import-pages.ts'
import type { ImportActor } from './access'
import { importUnavailable } from './access'
import { manifestStatements } from './manifest-statements'
import {
  readReservation,
  reservationWriteBindings,
  reservationWriteGuard,
} from './reservation-data'

export async function storeSnapshot(
  db: D1Database,
  actor: ImportActor,
  id: string,
  snapshot: ImportSnapshot,
  now: number,
) {
  const json = JSON.stringify(snapshot)
  const result = await db
    .prepare(
      `UPDATE conductor_import_reservations
    SET source_fingerprint = ?, snapshot_json = ? WHERE id = ?
      AND (snapshot_json IS NULL OR snapshot_json = ?) AND ${reservationWriteGuard()}`,
    )
    .bind(
      snapshot.sourceFingerprint,
      json,
      id,
      json,
      ...reservationWriteBindings(actor, now),
    )
    .run()
  if (!result.meta.changes) throw importUnavailable()
}

export async function storeManifestPage(
  db: D1Database,
  actor: ImportActor,
  id: string,
  offset: number,
  entries: ImportManifestEntry[],
  now: number,
) {
  const reservation = await readReservation(db, id)
  if (!reservation?.snapshotJson) throw importUnavailable()
  if (offset < reservation.manifestCount) {
    const existing = await db
      .prepare(
        `SELECT json FROM conductor_import_manifest
      WHERE reservation_id = ? AND ordinal >= ? AND ordinal < ? ORDER BY ordinal`,
      )
      .bind(id, offset, offset + entries.length)
      .all<{ json: string }>()
    if (
      existing.results.length !== entries.length ||
      existing.results.some(
        (row, index) => row.json !== JSON.stringify(entries[index]),
      )
    )
      throw importUnavailable()
    return
  }
  if (offset !== reservation.manifestCount || reservation.manifestClosed)
    throw importUnavailable()
  const guard = `EXISTS (SELECT 1 FROM conductor_import_reservations WHERE id = ?
    AND manifest_count = ? AND manifest_closed = 0 AND ${reservationWriteGuard()})`
  const bindings = [id, offset, ...reservationWriteBindings(actor, now)]
  const statements = manifestStatements(
    db,
    id,
    offset,
    entries,
    guard,
    bindings,
  )
  statements.push(
    db
      .prepare(
        `UPDATE conductor_import_reservations SET manifest_count = ?
    WHERE id = ? AND manifest_count = ? AND manifest_closed = 0 AND ${reservationWriteGuard()}`,
      )
      .bind(
        offset + entries.length,
        id,
        offset,
        ...reservationWriteBindings(actor, now),
      ),
  )
  const results = await db.batch(statements)
  if (!results.at(-1)?.meta.changes) throw importUnavailable()
}

export async function manifestPage(
  db: D1Database,
  id: string,
  offset: number,
): Promise<ImportManifestPage> {
  const rows = await db
    .prepare(
      `WITH candidates AS (SELECT ordinal,json FROM conductor_import_manifest
        WHERE reservation_id = ? AND ordinal >= ? ORDER BY ordinal LIMIT 64),
      sized AS (SELECT ordinal,json,SUM(length(CAST(json AS BLOB))) OVER (ORDER BY ordinal) AS bytes FROM candidates)
      SELECT ordinal,json FROM sized WHERE bytes <= 750000 OR ordinal = (SELECT MIN(ordinal) FROM candidates) ORDER BY ordinal`,
    )
    .bind(id, offset)
    .all<{ ordinal: number; json: string }>()
  const entries = importPage(
    rows.results.map((row) => readImportManifestEntry(JSON.parse(row.json))),
    (entries) => ({ offset, entries, nextCursor: offset + entries.length }),
  )
  const next = offset + entries.length
  const remaining = await db
    .prepare(
      'SELECT 1 FROM conductor_import_manifest WHERE reservation_id = ? AND ordinal >= ? LIMIT 1',
    )
    .bind(id, next)
    .first()
  return { offset, entries, nextCursor: remaining ? next : null }
}
