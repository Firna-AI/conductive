import type { ImportControlResult } from '../../../src/shared/conductor-import-operation.ts'
import { LocalImportError } from './types.ts'
import { requireKind } from './upload-context.ts'
import type {
  ImportUploadDependencies,
  UploadAction,
} from './upload-context.ts'
import { packageImportStage } from './upload-package.ts'
import { uploadImportPart } from './upload-part.ts'

export async function runImportUpload(
  action: UploadAction,
  dependencies: ImportUploadDependencies,
): Promise<void> {
  const { jobs, signal, channel } = dependencies
  const row = await jobs(
    { action: 'row', localWorkspaceId: action.localWorkspaceId },
    signal,
  )
  if (!row) throw new LocalImportError('source_missing')
  const reservation = requireKind(
    await channel.exchange({ kind: 'reserve', row }),
    'reservation',
  ).reservation
  const { stage, reservation: current } = await packageImportStage(
    action,
    reservation,
    row,
    dependencies,
  )
  const reservationId = current.id
  await channel.exchange({
    kind: 'snapshot',
    reservationId,
    snapshot: stage.snapshot,
  })
  let offset = 0
  while (offset < stage.snapshot.recordCount) {
    const remaining = await jobs(
      { action: 'page', stageId: stage.id, offset },
      signal,
    )
    const page = channel.page(remaining, (entries) => ({
      kind: 'manifest',
      reservationId,
      offset,
      entries,
    }))
    if (!page.length) throw new LocalImportError('read_failed')
    await channel.exchange({
      kind: 'manifest',
      reservationId,
      offset,
      entries: page,
    })
    offset += page.length
  }
  await channel.exchange({ kind: 'manifest.end', reservationId })
  let cursor: number | null = 0
  while (cursor !== null) {
    const missing: Extract<ImportControlResult, { kind: 'missing' }> =
      requireKind(
        await channel.exchange({ kind: 'missing', reservationId, cursor }),
        'missing',
      )
    for (const part of missing.parts)
      await uploadImportPart(part, stage, reservationId, dependencies)
    if (missing.nextCursor !== null && missing.nextCursor <= cursor)
      throw new LocalImportError('upload_failed')
    cursor = missing.nextCursor
  }
  requireKind(
    await channel.exchange({ kind: 'complete', reservationId }),
    'complete',
  )
  const results = await jobs({ action: 'results', stageId: stage.id }, signal)
  await channel.list(results.files, (files) => ({
    kind: 'result.files',
    localWorkspaceId: action.localWorkspaceId,
    files,
  }))
  await channel.list(results.sessions, (sessions) => ({
    kind: 'result.sessions',
    localWorkspaceId: action.localWorkspaceId,
    sessions,
  }))
}
