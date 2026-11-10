import { readImportSnapshot } from '../../src/shared/conductor-import-manifest-read.ts'
import { IMPORT_PART_BYTES } from '../../src/shared/conductor-import-pages.ts'
import type { ImportByteRange } from '../../src/shared/conductor-import-storage.ts'
import type { AppEnv } from '../env'
import { importUnavailable } from './access'
import { manifestPage } from './manifest-data'
import { readPartRecord } from './part-data'
import { readReservation } from './reservation-data'
import { createR2ImportStorage } from './r2-storage'

/** @public Trusted lifecycle callers must authorize activation before this read. */
export async function readPublishedImport(
  env: AppEnv,
  orgId: string,
  workspaceId: string,
) {
  const row = await readReservation(env.DB, workspaceId)
  if (
    !row ||
    row.orgId !== orgId ||
    row.state !== 'complete' ||
    !row.snapshotJson
  )
    throw importUnavailable()
  const exists = await env.DB.prepare(
    'SELECT 1 FROM workspaces WHERE id = ? AND org_id = ?',
  )
    .bind(workspaceId, orgId)
    .first()
  if (!exists) throw importUnavailable()
  return {
    reservationId: row.id,
    repositoryId: row.repositoryId,
    branch: row.branch,
    localWorkspaceId: row.localWorkspaceId,
    importerUserId: row.importerUserId,
    snapshot: readImportSnapshot(JSON.parse(row.snapshotJson)),
  }
}

/** @public Pages retain private memory recipes and exact bundle prerequisites. */
export async function readPublishedManifestPage(
  env: AppEnv,
  orgId: string,
  workspaceId: string,
  cursor = 0,
) {
  await readPublishedImport(env, orgId, workspaceId)
  return manifestPage(env.DB, workspaceId, cursor)
}

/** @public The lifecycle delivers these bytes over its authenticated runner connection. */
export async function readPublishedPartRange(
  env: AppEnv,
  orgId: string,
  workspaceId: string,
  partId: string,
  range: ImportByteRange,
  signal?: AbortSignal,
) {
  await readPublishedImport(env, orgId, workspaceId)
  const part = await readPartRecord(env.DB, workspaceId, partId)
  if (!part?.verified) throw importUnavailable()
  const scope = { orgId, reservationId: workspaceId }
  return createR2ImportStorage(env, scope, {
    maxPartBytes: IMPORT_PART_BYTES,
    maxReadBytes: IMPORT_PART_BYTES,
  }).readPart({ scope, part: part.part }, range, signal)
}
