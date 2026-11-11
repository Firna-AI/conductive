import type {
  ImportPart,
  ImportUploadTarget,
  ImportUploadIdentity,
} from '../../src/shared/conductor-import-storage.ts'
import { readImportPart } from '../../src/shared/conductor-import-manifest-read.ts'
import {
  importObject,
  importText,
} from '../../src/shared/conductor-import-values.ts'
import { importPage } from '../../src/shared/conductor-import-pages.ts'
import type { ImportActor } from './access'
import { importUnavailable } from './access'
import {
  reservationWriteBindings,
  reservationWriteGuard,
} from './reservation-data'

export interface StoredImportPart {
  part: ImportPart
  objectId: string
  index: number
  target: ImportUploadIdentity | null
  expiresAt: number | null
  verified: boolean
}

interface PartRow {
  id: string
  objectId: string
  partIndex: number
  groupName: string
  sizeBytes: number
  sha256: string
  targetJson: string | null
  expiresAt: number | null
  verified: number
  ordinal: number
}
const columns = `id, object_id AS objectId, part_index AS partIndex, group_name AS groupName,
  size_bytes AS sizeBytes, sha256, target_json AS targetJson, target_expires_at AS expiresAt, verified, ordinal`

function storedPart(row: PartRow): StoredImportPart {
  const part = readImportPart({ ...row, group: row.groupName })
  const target =
    row.targetJson === null ? null : importObject(JSON.parse(row.targetJson))
  const scope = target === null ? null : importObject(target.scope)
  return {
    part,
    objectId: row.objectId,
    index: row.partIndex,
    expiresAt: row.expiresAt,
    target:
      target === null || scope === null
        ? null
        : {
            scope: {
              orgId: importText(scope.orgId),
              reservationId: importText(scope.reservationId),
            },
            part,
            uploadId: importText(target.uploadId),
          },
    verified: row.verified === 1,
  }
}

export async function readPartRecord(
  db: D1Database,
  id: string,
  partId: string,
) {
  const row = await db
    .prepare(
      `SELECT ${columns} FROM conductor_import_parts WHERE reservation_id = ? AND id = ?`,
    )
    .bind(id, partId)
    .first<PartRow>()
  return row ? storedPart(row) : null
}

export async function missingParts(db: D1Database, id: string, cursor: number) {
  const rows = await db
    .prepare(
      `SELECT ${columns} FROM conductor_import_parts
    WHERE reservation_id = ? AND verified = 0 AND ordinal >= ? ORDER BY ordinal LIMIT 1`,
    )
    .bind(id, cursor)
    .all<PartRow>()
  const page = importPage(rows.results, (parts) => ({
    kind: 'missing',
    parts: parts.map((row) => storedPart(row).part),
    nextCursor: 0,
  }))
  const next = page.length ? page[page.length - 1].ordinal + 1 : cursor
  const remaining = await db
    .prepare(
      `SELECT 1 FROM conductor_import_parts
    WHERE reservation_id = ? AND verified = 0 AND ordinal >= ? LIMIT 1`,
    )
    .bind(id, next)
    .first()
  return {
    parts: page.map((row) => storedPart(row).part),
    nextCursor: remaining ? next : null,
  }
}

export async function saveTarget(
  db: D1Database,
  actor: ImportActor,
  id: string,
  target: ImportUploadTarget,
  now: number,
) {
  const guard = `EXISTS (SELECT 1 FROM conductor_import_reservations WHERE id = ?
    AND manifest_closed = 1 AND ${reservationWriteGuard()})`
  const bindings = [id, ...reservationWriteBindings(actor, now)]
  const results = await db.batch([
    db
      .prepare(
        `UPDATE conductor_import_parts SET target_json = ?, target_expires_at = ?
      WHERE reservation_id = ? AND id = ? AND verified = 0 AND ${guard}`,
      )
      .bind(
        JSON.stringify(target.identity),
        target.expiresAt,
        id,
        target.identity.part.id,
        ...bindings,
      ),
    db
      .prepare(
        `UPDATE conductor_import_cleanup SET latest_target_at = MAX(latest_target_at, ?)
      WHERE reservation_id = ? AND group_name = 'none' AND ${guard}`,
      )
      .bind(target.expiresAt, id, ...bindings),
    db
      .prepare(
        `INSERT INTO conductor_import_targets
      (reservation_id,part_id,upload_id,identity_json,expires_at) SELECT ?,?,?,?,? WHERE ${guard}`,
      )
      .bind(
        id,
        target.identity.part.id,
        target.identity.uploadId,
        JSON.stringify(target.identity),
        target.expiresAt,
        ...bindings,
      ),
  ])
  if (!results[0].meta.changes || !results[1].meta.changes)
    throw importUnavailable()
}

export async function markPartVerified(
  db: D1Database,
  actor: ImportActor,
  id: string,
  partId: string,
  now: number,
) {
  await db.batch([
    db
      .prepare(
        `UPDATE conductor_import_parts SET verified = 1 WHERE reservation_id = ? AND id = ?
      AND EXISTS (SELECT 1 FROM conductor_import_reservations WHERE id = ? AND ${reservationWriteGuard()})`,
      )
      .bind(id, partId, id, ...reservationWriteBindings(actor, now)),
    db
      .prepare(
        `UPDATE conductor_import_reservations SET stored_bytes =
      (SELECT COALESCE(SUM(size_bytes),0) FROM conductor_import_parts WHERE reservation_id = ? AND verified = 1)
      WHERE id = ? AND ${reservationWriteGuard()}`,
      )
      .bind(id, id, ...reservationWriteBindings(actor, now)),
  ])
}
