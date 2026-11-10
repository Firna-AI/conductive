import type {
  ConductorImportStorage,
  ImportUploadIdentity,
} from '../../src/shared/conductor-import-storage.ts'
import type { ImportActor } from './access'
import { importUnavailable } from './access'
import { beginImportWrite, endImportWrite } from './cleanup-data'
import {
  markPartVerified,
  missingParts,
  readPartRecord,
  saveTarget,
} from './part-data'
import { importTargetPage } from './target-data'

async function sealStoredTarget(
  db: D1Database,
  storage: ConductorImportStorage,
  actor: ImportActor,
  id: string,
  identity: ImportUploadIdentity,
  now: () => number,
) {
  if (!(await beginImportWrite(db, id, identity, actor, now())))
    throw importUnavailable()
  const sealed = await storage.sealPart(identity)
  await endImportWrite(db, id)
  return sealed
}

/** The reservation owner holds its serial queue through every storage write. */
export async function importPartOperation(
  db: D1Database,
  storage: ConductorImportStorage,
  actor: ImportActor,
  id: string,
  event: { kind: 'target' | 'verify'; partId: string },
  now: () => number,
) {
  const saved = await readPartRecord(db, id, event.partId)
  if (!saved) throw importUnavailable()
  if (event.kind === 'target') {
    if (saved.verified) throw importUnavailable()
    const target = await storage.createUploadTarget(saved.part)
    await saveTarget(db, actor, id, target, now())
    return { kind: 'target' as const, target }
  }
  if (!saved.verified && saved.target) {
    let sealed = await sealStoredTarget(
      db,
      storage,
      actor,
      id,
      saved.target,
      now,
    )
    let after = ''
    while (!sealed) {
      const targets = await importTargetPage(db, id, event.partId, after)
      for (const target of targets) {
        after = target.uploadId
        if (target.uploadId !== saved.target.uploadId)
          sealed = await sealStoredTarget(db, storage, actor, id, target, now)
        if (sealed) break
      }
      if (targets.length === 0) break
    }
    if (sealed) await markPartVerified(db, actor, id, event.partId, now())
  }
  const part = await readPartRecord(db, id, event.partId)
  const row = await db
    .prepare(
      'SELECT stored_bytes FROM conductor_import_reservations WHERE id = ?',
    )
    .bind(id)
    .first<number>('stored_bytes')
  return {
    kind: 'verified' as const,
    verified: part?.verified === true,
    storedBytes: row ?? 0,
  }
}

export async function checkedMissingPart(
  db: D1Database,
  storage: ConductorImportStorage,
  actor: ImportActor,
  id: string,
  cursor: number,
  now: () => number,
) {
  const page = await missingParts(db, id, cursor)
  const first = page.parts[0]
  if (!first) return { kind: 'missing' as const, ...page }
  const checked = await importPartOperation(
    db,
    storage,
    actor,
    id,
    { kind: 'verify', partId: first.id },
    now,
  )
  return {
    kind: 'missing' as const,
    parts: checked.kind === 'verified' && checked.verified ? [] : page.parts,
    nextCursor: page.nextCursor,
  }
}
