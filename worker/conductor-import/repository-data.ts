import {
  importObject,
  importText,
} from '../../src/shared/conductor-import-values.ts'
import type { ImportActor } from './access'
import { importUnavailable } from './access'
import {
  reservationWriteBindings,
  reservationWriteGuard,
} from './reservation-data'

export async function storeRepositoryProof(
  db: D1Database,
  actor: ImportActor,
  reservationId: string,
  id: string,
  kind: 'facts' | 'prerequisites',
  value: unknown,
  now: number,
) {
  const saved = await db
    .prepare(
      `INSERT INTO conductor_import_proofs (reservation_id,id,kind,json)
    SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM conductor_import_reservations WHERE id = ? AND ${reservationWriteGuard()})`,
    )
    .bind(
      reservationId,
      id,
      kind,
      JSON.stringify(value),
      reservationId,
      ...reservationWriteBindings(actor, now),
    )
    .run()
  if (!saved.meta.changes) throw importUnavailable()
}

export async function repositoryProof(
  db: D1Database,
  reservationId: string,
  id: string,
) {
  const saved = await db
    .prepare(
      `SELECT json FROM conductor_import_proofs
    WHERE reservation_id = ? AND id = ? AND kind = 'facts'`,
    )
    .bind(reservationId, id)
    .first<{ json: string }>()
  if (!saved) throw importUnavailable()
  const value = importObject(JSON.parse(saved.json))
  if (importText(value.id) !== id) throw importUnavailable()
  return value
}

export async function storeVerifiedPrerequisite(
  db: D1Database,
  actor: ImportActor,
  reservationId: string,
  receiptId: string,
  oid: string,
  headOid: string,
  now: number,
) {
  const saved = await db
    .prepare(
      `INSERT OR IGNORE INTO conductor_import_verified_prerequisites
    (reservation_id,receipt_id,oid,head_oid) SELECT ?,?,?,? WHERE EXISTS (
      SELECT 1 FROM conductor_import_reservations WHERE id = ? AND ${reservationWriteGuard()})`,
    )
    .bind(
      reservationId,
      receiptId,
      oid,
      headOid,
      reservationId,
      ...reservationWriteBindings(actor, now),
    )
    .run()
  if (!saved.meta.changes) throw importUnavailable()
}
