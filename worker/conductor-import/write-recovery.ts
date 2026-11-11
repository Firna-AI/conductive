import type {
  ConductorImportStorage,
  ImportStorageScope,
  ImportUploadIdentity,
} from '../../src/shared/conductor-import-storage.ts'
import { readImportPart } from '../../src/shared/conductor-import-manifest-read.ts'
import {
  importObject,
  importText,
} from '../../src/shared/conductor-import-values.ts'
import { endImportWrite } from './cleanup-data'
import { importUnavailable } from './access'

/** Reconstruction retries the exact admitted seal before any later deletion. */
export async function recoverImportWrite(
  db: D1Database,
  scope: ImportStorageScope,
  storage: ConductorImportStorage,
) {
  const row = await db
    .prepare(
      `SELECT pending_write_json AS json,in_flight AS count FROM conductor_import_cleanup WHERE reservation_id = ?`,
    )
    .bind(scope.reservationId)
    .first<{ json: string | null; count: number }>()
  if (!row?.count) return
  if (!row.json || row.count !== 1) throw importUnavailable()
  const input = importObject(JSON.parse(row.json))
  const identityScope = importObject(input.scope)
  const identity: ImportUploadIdentity = {
    scope: {
      orgId: importText(identityScope.orgId),
      reservationId: importText(identityScope.reservationId),
    },
    part: readImportPart(input.part),
    uploadId: importText(input.uploadId),
  }
  if (
    identity.scope.orgId !== scope.orgId ||
    identity.scope.reservationId !== scope.reservationId
  )
    throw importUnavailable()
  await storage.sealPart(identity)
  await endImportWrite(db, scope.reservationId)
}
