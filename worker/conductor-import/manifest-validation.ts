import type { ImportSnapshot } from '../../src/shared/conductor-import-manifest.ts'
import { IMPORT_PART_BYTES } from '../../src/shared/conductor-import-pages.ts'
import type { ImportActor } from './access'
import { importUnavailable } from './access'
import {
  reservationWriteBindings,
  reservationWriteGuard,
} from './reservation-data'

export async function closeManifest(
  db: D1Database,
  actor: ImportActor,
  id: string,
  snapshot: ImportSnapshot,
  now: number,
) {
  const totals = await db
    .prepare(
      `SELECT
    (SELECT COUNT(*) FROM conductor_import_manifest WHERE reservation_id = ?) AS records,
    (SELECT COUNT(*) FROM conductor_import_objects WHERE reservation_id = ?) AS objects,
    (SELECT COUNT(*) FROM conductor_import_parts WHERE reservation_id = ?) AS parts,
    (SELECT COUNT(*) FROM conductor_import_documents WHERE reservation_id = ?) AS sessions,
    (SELECT COALESCE(SUM(size_bytes),0) FROM conductor_import_objects WHERE reservation_id = ?) AS stored,
    (SELECT COALESCE(SUM(restored_bytes),0) FROM conductor_import_objects WHERE reservation_id = ?) AS restored`,
    )
    .bind(id, id, id, id, id, id)
    .first<{
      records: number
      objects: number
      parts: number
      sessions: number
      stored: number
      restored: number
    }>()
  if (
    !totals ||
    totals.records !== snapshot.recordCount ||
    totals.objects !== snapshot.objectCount ||
    totals.parts !== snapshot.partCount ||
    totals.sessions !== snapshot.sessionCount ||
    totals.stored !== snapshot.storedBytes ||
    totals.restored !== snapshot.restoredBytes
  )
    throw importUnavailable()
  const errors = [
    `SELECT 1 FROM conductor_import_objects o LEFT JOIN conductor_import_parts p
      ON p.reservation_id = o.reservation_id AND p.object_id = o.id WHERE o.reservation_id = ?
      GROUP BY o.id HAVING COUNT(p.id) != o.part_count OR COALESCE(SUM(p.size_bytes),0) != o.size_bytes
        OR MIN(p.part_index) != 0 OR MAX(p.part_index) != o.part_count - 1
        OR MIN(p.group_name) != CASE WHEN o.purpose = 'document' THEN 'document' ELSE 'work' END
        OR MAX(p.group_name) != CASE WHEN o.purpose = 'document' THEN 'document' ELSE 'work' END`,
    `SELECT 1 FROM conductor_import_parts p LEFT JOIN conductor_import_objects o
      ON o.reservation_id = p.reservation_id AND o.id = p.object_id
      WHERE p.reservation_id = ? AND (o.id IS NULL OR p.size_bytes > ${IMPORT_PART_BYTES})`,
    `SELECT 1 FROM conductor_import_manifest m LEFT JOIN conductor_import_objects o
      ON o.reservation_id = m.reservation_id AND o.id = json_extract(m.json,'$.objectId')
      WHERE m.reservation_id = ? AND m.kind = 'file' AND (o.id IS NULL OR o.purpose != 'file')`,
    `SELECT 1 FROM conductor_import_documents d
      LEFT JOIN conductor_import_objects o ON o.reservation_id = d.reservation_id AND o.id = d.object_id
      LEFT JOIN conductor_import_objects n ON n.reservation_id = d.reservation_id AND n.id = d.memory_object_id
      WHERE d.reservation_id = ? AND (o.id IS NULL OR o.purpose != 'document' OR n.id IS NULL OR n.purpose != 'memory')`,
    `WITH RECURSIVE ancestors(reservation_id,path,prefix,rest) AS (
      SELECT reservation_id,path,'',path FROM conductor_import_manifest WHERE reservation_id = ? AND path IS NOT NULL
      UNION ALL SELECT reservation_id,path,prefix || CASE WHEN prefix = '' THEN '' ELSE '/' END ||
        substr(rest,1,instr(rest,'/')-1),substr(rest,instr(rest,'/')+1)
      FROM ancestors WHERE instr(rest,'/') > 0)
      SELECT 1 FROM ancestors p JOIN conductor_import_manifest a
        ON a.reservation_id = p.reservation_id AND a.path = p.prefix
      WHERE p.prefix != '' AND a.kind IN ('file','symlink')`,
    `SELECT 1 FROM conductor_import_objects WHERE reservation_id = ?
      AND encoding = 'identity' AND size_bytes != restored_bytes`,
    `SELECT 1 FROM conductor_import_manifest m LEFT JOIN conductor_import_proofs p
      ON p.reservation_id = m.reservation_id AND p.id = json_extract(m.json,'$.receiptId') AND p.kind = 'prerequisites'
      WHERE m.reservation_id = ? AND m.kind = 'prerequisite' AND (p.id IS NULL
        OR json_extract(p.json,'$.sourceFingerprint') != '${snapshot.sourceFingerprint}'
        OR json_extract(p.json,'$.headOid') != '${snapshot.headOid}'
        OR NOT EXISTS (SELECT 1 FROM conductor_import_verified_prerequisites proof
          WHERE proof.reservation_id = m.reservation_id AND proof.receipt_id = p.id
            AND proof.oid = json_extract(m.json,'$.oid')))`,
  ]
  for (const sql of errors)
    if (await db.prepare(`${sql} LIMIT 1`).bind(id).first())
      throw importUnavailable()
  const bundles = await db
    .prepare(
      `SELECT id FROM conductor_import_objects WHERE reservation_id = ? AND purpose = 'bundle'`,
    )
    .bind(id)
    .all<{ id: string }>()
  if (
    snapshot.bundleObjectId === null
      ? bundles.results.length !== 0
      : bundles.results.length !== 1 ||
        bundles.results[0].id !== snapshot.bundleObjectId
  )
    throw importUnavailable()
  if (
    snapshot.bundleObjectId === null &&
    !(await db
      .prepare(
        `SELECT 1 FROM conductor_import_manifest
    WHERE reservation_id = ? AND kind = 'prerequisite' AND record_key = ?`,
      )
      .bind(id, snapshot.headOid)
      .first())
  )
    throw importUnavailable()
  const result = await db
    .prepare(
      `UPDATE conductor_import_reservations SET manifest_closed = 1
    WHERE id = ? AND ${reservationWriteGuard()}`,
    )
    .bind(id, ...reservationWriteBindings(actor, now))
    .run()
  if (!result.meta.changes) throw importUnavailable()
}
